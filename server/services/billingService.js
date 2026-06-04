const { bills, bill_items, products, audit_log, customers, payments, users, alerts, sequelize } = require('../models');
const { logActivity } = require('./auditService');

class BillingService {
    static async getSystemUserId(transaction = null) {
        const [user] = await users.findOrCreate({
            where: { user_name: 'system' },
            defaults: {
                first_name: 'System',
                last_name: 'User',
                password: 'system_placeholder',
                role: 'Admin',
                status: 'Active',
                failed_attempts: 0,
                is_locked: false
            },
            transaction
        });
        return user.user_id;
    }

    static async findUserById(userId) {
        return await users.findByPk(userId);
    }

    static async createInvoice(saleData, userId) {
        return await sequelize.transaction(async (t) => {
            
            // 1. Handle Customer (For Partial Payments or Records)
            let customerId = null;
            if (saleData.customer && saleData.customer.phone) {
                const [customer] = await customers.findOrCreate({
                    where: { phone_no: saleData.customer.phone },
                    defaults: {
                      customer_name: saleData.customer.name,
                      address: saleData.customer.address || null
                    },
                    transaction: t
                });
                customerId = customer.customer_id;
            }

            // 2. Pre-Check Stock & Active Status
            for (const item of saleData.items) {
                const product = await products.findByPk(item.product_id, { transaction: t });
                const isActiveStatus = [0, '0', 'active', 'Active', 'ACTIVE'].includes(product?.status);
                if (!product || !isActiveStatus) throw new Error(`Product ${item.product_id} is unavailable.`);
                if (product.stock_quantity < item.quantity) throw new Error(`Low stock for ${product.product_name}.`);
            }

            // 3. Generate Sequential Bill No (INV-YYYY-NNNN)
            const count = await bills.count({ transaction: t });
            const bill_no = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

            // 4. Create Bill (Include Balance Due for Partial Payments)
            const bill = await bills.create({
                bill_no,
                user_id: userId,
                customer_id: customerId,
                subtotal: saleData.subtotal,
                discount: saleData.discount,
                total_amount: saleData.total_amount,
                balance_due: saleData.balance_due || 0,
                status: saleData.balance_due > 0 ? 'PARTIAL' : 'PAID'
            }, { transaction: t });

            // 5. Update Inventory & Items
            const lowStockAlerts = [];
            for (const item of saleData.items) {
                const quantity = Number(item.quantity) || 0;
                const pricePerUnit = parseFloat(item.price) || 0;
                const discount = parseFloat(item.discount) || 0;
                const totalPrice = (quantity * pricePerUnit) - discount;

                await bill_items.create({
                    bill_id: bill.bill_id,
                    product_id: item.product_id,
                    quantity,
                    price_per_unit: pricePerUnit,
                    discount,
                    total_price: totalPrice
                }, { transaction: t });

                await products.decrement('stock_quantity', {
                    by: quantity,
                    where: { product_id: item.product_id },
                    transaction: t
                });

                const updatedProduct = await products.findByPk(item.product_id, { transaction: t });
                const stock = updatedProduct.stock_quantity;
                const minQty = updatedProduct.min_stock_quantity;
                const reorder = updatedProduct.reorder_level;

                // Determine which inventory alert types now apply
                const alertsToEnsure = [];
                if (stock === 0) {
                    alertsToEnsure.push('Out of Stock');
                } else {
                    if (stock <= minQty)  alertsToEnsure.push('Low Stock');
                    if (stock <= reorder) alertsToEnsure.push('Reorder');
                }

                for (const alert_type of alertsToEnsure) {
                    const existing = await alerts.findOne({
                        where: { product_id: item.product_id, alert_type, is_resolved: false },
                        transaction: t
                    });
                    if (!existing) {
                        await alerts.create(
                            { product_id: item.product_id, alert_type, is_resolved: false },
                            { transaction: t }
                        );
                    }
                }

                if (alertsToEnsure.length > 0) lowStockAlerts.push(updatedProduct.product_name);
            }

            // 6. Record Payment
            await payments.create({
                bill_id: bill.bill_id,
                amount_paid: saleData.amount_paid,
                payment_method: saleData.payment_method || 'CASH'
            }, { transaction: t });

            // 7. Final Audit Log (outside transaction so it never blocks the bill)
            process.nextTick(() => logActivity(userId, null, 'INVOICE_CREATED',
              `Invoice ${bill_no} created. Total: ${saleData.total_amount}, Paid: ${saleData.amount_paid}, Due: ${saleData.balance_due || 0}`
            ));

            const billData = bill.toJSON();
            billData.lowStockAlerts = lowStockAlerts;
            return billData;
        });
    }
}

module.exports = BillingService;