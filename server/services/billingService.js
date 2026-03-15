const { bills, bill_items, products, audit_log, customers, payments, sequelize } = require('../models');

class BillingService {
    static async createInvoice(saleData, userId) {
        return await sequelize.transaction(async (t) => {
            
            // 1. Handle Customer (For Partial Payments or Records)
            let customerId = null;
            if (saleData.customer && saleData.customer.phone) {
                const [customer] = await customers.findOrCreate({
                    where: { phone: saleData.customer.phone },
                    defaults: { name: saleData.customer.name },
                    transaction: t
                });
                customerId = customer.customer_id;
            }

            // 2. Pre-Check Stock & Active Status
            for (const item of saleData.items) {
                const product = await products.findByPk(item.product_id, { transaction: t });
                if (!product || product.status !== 'active') throw new Error(`Product ${item.product_id} is unavailable.`);
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
                await bill_items.create({
                    bill_id: bill.bill_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_unit: item.price
                }, { transaction: t });

                await products.decrement('stock_quantity', {
                    by: item.quantity,
                    where: { product_id: item.product_id },
                    transaction: t
                });
            }

            // 6. Record Payment
            await payments.create({
                bill_id: bill.bill_id,
                amount_paid: saleData.amount_paid,
                payment_method: 'CASH',
                transaction: t
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