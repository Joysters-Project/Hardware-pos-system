const { bills, bill_items, products, audit_log, customers, payments, users, alerts, sequelize } = require('../models');
const { logActivity } = require('./auditService');
const { syncAlertsForProduct } = require('./alertService');
const { deductStockFEFO } = require('./batchService');
const { validateSriLankanPhone } = require('../utils/phoneValidation');

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
                // Validate phone number before storing
                const phoneValidation = validateSriLankanPhone(saleData.customer.phone);
                if (!phoneValidation.isValid) {
                    throw new Error(`Invalid customer phone number: ${phoneValidation.message}`);
                }
                const formattedPhone = phoneValidation.formatted;

                const [customer] = await customers.findOrCreate({
                    where: { phone_no: formattedPhone },
                    defaults: {
                      customer_name: saleData.customer.name,
                      address: saleData.customer.address || null
                    },
                    transaction: t
                });
                customerId = customer.customer_id;
            }

            // 2. Pre-Check Stock & Active Status
            const requestedBaseQtyMap = {};
            for (const item of (saleData.items || [])) {
                const factor = Number(item.conversion_factor) || 1.0;
                const qty = Number(item.quantity) || 0;
                const baseQty = qty * factor;
                requestedBaseQtyMap[item.product_id] = (requestedBaseQtyMap[item.product_id] || 0) + baseQty;
            }

            for (const [productId, totalRequestedQty] of Object.entries(requestedBaseQtyMap)) {
                const product = await products.findByPk(productId, { transaction: t });
                const isActiveStatus = [0, '0', 'active', 'Active', 'ACTIVE'].includes(product?.status);
                if (!product || !isActiveStatus) {
                    throw new Error(`Product "${product?.product_name || productId}" is unavailable or inactive.`);
                }
                const availableStock = Number(product.stock_quantity ?? 0);
                if (availableStock < totalRequestedQty) {
                    throw new Error(`Insufficient stock for "${product.product_name}". Available stock is ${availableStock}, but requested selling quantity is ${totalRequestedQty}.`);
                }
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
                const factor = Number(item.conversion_factor) || 1;
                const baseQuantityDeducted = quantity * factor;
                const pricePerUnit = parseFloat(item.price) || 0;
                const discount = parseFloat(item.discount) || 0;
                const totalPrice = (quantity * pricePerUnit) - discount;

                await bill_items.create({
                    bill_id: bill.bill_id,
                    product_id: item.product_id,
                    quantity: baseQuantityDeducted,
                    billed_quantity: quantity,
                    billed_unit_id: item.selected_unit_id || null,
                    price_per_unit: pricePerUnit,
                    discount,
                    total_price: totalPrice
                }, { transaction: t });

                // Decrement stock atomically inside the transaction to prevent oversell.
                // Batch FEFO deduction + full sync runs after commit (see process.nextTick below).
                await products.decrement('stock_quantity', {
                    by: baseQuantityDeducted,
                    where: { product_id: item.product_id },
                    transaction: t
                });

                const updatedProduct = await products.findByPk(item.product_id, { transaction: t });
                if (updatedProduct) lowStockAlerts.push(updatedProduct.product_name);
            }

            // 6. Record Payment
            await payments.create({
                bill_id: bill.bill_id,
                amount_paid: saleData.amount_paid,
                payment_method: saleData.payment_method || 'CASH'
            }, { transaction: t });

            // 7. Final Audit Log, FEFO Batch Deduction, and Inventory Sync (after transaction commits)
            process.nextTick(async () => {
                try {
                    await logActivity(userId, null, 'INVOICE_CREATED',
                      `Invoice ${bill_no} created. Total: ${saleData.total_amount}, Paid: ${saleData.amount_paid}, Due: ${saleData.balance_due || 0}`
                    );

                    const autoReorderService = require('./autoReorderService');
                    const forecastService = require('./forecastService');

                    for (const item of saleData.items) {
                        const factor = Number(item.conversion_factor) || 1;
                        const baseQty = Number(item.quantity) * factor;
                        // Record inventory movement
                        await logActivity(userId, null, 'INVENTORY_MOVEMENT',
                          `Sales checkout: reduced stock of product_id=${item.product_id} by ${baseQty} units for Invoice ${bill_no}`
                        );

                        // Steps 1-4: Deduct batches FEFO, mark zero-qty batches Expired,
                        // sync product stock_quantity + expiry_date + status from active batches.
                        await deductStockFEFO(item.product_id, item.quantity);

                        // Step 5: Sync expiry alerts using the now-updated product + active batches.
                        const soldProduct = await products.findByPk(item.product_id);
                        if (soldProduct) await syncAlertsForProduct(soldProduct);

                        await autoReorderService.checkProductReorder(item.product_id);
                        await forecastService.getProductForecast(item.product_id);
                    }
                } catch (err) {
                    console.error('[BillingService] Post-commit inventory sync error:', err.message);
                }
            });

            const billData = bill.toJSON();
            billData.lowStockAlerts = lowStockAlerts;
            return billData;
        });
    }
}

module.exports = BillingService;