exports.generateBill = async (req, res) => {
    try {
        // Task: Ensure user_id is linked (SRS 3.4)
        const userId = req.user.id;

        // Task: Pass everything to the Service where the Transaction lives
        const bill = await BillingService.createInvoice(req.body, userId);

        res.status(201).json({ 
            success: true, 
            message: "Bill generated successfully", 
            data: bill 
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

const { bills, bill_items, products, audit_log, sequelize } = require('../models');

class BillingService {
    static async createInvoice(saleData, userId) {
        // Task: Open sequelize.transaction() — all writes inside
        return await sequelize.transaction(async (t) => {
            
            // 1. PRE-CHECKS (Task: Block expired/inactive/out-of-stock)
            for (const item of saleData.items) {
                const product = await products.findByPk(item.product_id, { transaction: t });
                
                if (!product) throw new Error(`Product ${item.product_id} not found`);
                if (product.status !== 'active') throw new Error(`${product.product_name} is inactive`);
                if (product.stock_quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.product_name}`);
                }
            }

            // 2. AUTO-GENERATE BILL NO (Task: INV-YYYY-NNNN)
            const billCount = await bills.count({ transaction: t });
            const bill_no = `INV-${new Date().getFullYear()}-${(billCount + 1).toString().padStart(4, '0')}`;

            // 3. CREATE BILL (Task: Bills.create inside transaction)
            const bill = await bills.create({
                bill_no,
                user_id: userId,
                subtotal: saleData.subtotal,
                discount: saleData.discount,
                total_amount: saleData.total_amount
            }, { transaction: t });

            // 4. PROCESS ITEMS & STOCK (Task: Products.decrement inside transaction)
            for (const item of saleData.items) {
                await bill_items.create({
                    bill_id: bill.bill_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_per_unit: item.price // Snapshot price
                }, { transaction: t });

                await products.decrement('stock_quantity', {
                    by: item.quantity,
                    where: { product_id: item.product_id },
                    transaction: t
                });
                
                // Task: Trigger alert check for each product after decrement
                // Logic can go here or via a Hook in the Product model
            }

            // 5. AUDIT LOG (Task: AuditLog.create inside transaction)
            await audit_log.create({
                user_id: userId,
                action: 'GENERATE_BILL',
                details: JSON.stringify({ bill_no, total: bill.total_amount })
            }, { transaction: t });

            return bill;
        });
    }
}