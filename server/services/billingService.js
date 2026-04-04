const { bills, bill_items, products, audit_log, customers, payments, users, sequelize } = require('../models');

class BillingService {
    static async getSystemUserId(transaction = null) {
        const [user] = await users.findOrCreate({
            where: { user_name: 'system' },
            defaults: {
                first_name: 'System',
                last_name: 'User',
                password: 'system',
                role: 'ADMIN',
                status: 'Active'
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
            }

            // 6. Record Payment
            await payments.create({
                bill_id: bill.bill_id,
                amount_paid: saleData.amount_paid,
                payment_status: 'CASH'
            }, { transaction: t });

            // 7. Final Audit Log
            await audit_log.create({
                user_id: userId,
                action: 'GENERATE_BILL',
                details: `Bill ${bill_no} processed. Paid: ${saleData.amount_paid}, Due: ${saleData.balance_due}`
            }, { transaction: t });

            return bill;
        });
    }
}

module.exports = BillingService;