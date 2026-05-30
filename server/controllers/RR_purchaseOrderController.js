const { purchase_orders, po_items, sequelize } = require('../models');

// CREATE Purchase Order
exports.createPurchaseOrder = async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        
        const { items, ...poData } = req.body;

        // Validate required fields
        if (!poData.supplier_id) {
            return res.status(400).json({ error: "supplier_id is required" });
        }

        // Auto-generate PO number (PO-YYYY-NNNN)
        const maxPo = await purchase_orders.max('po_id') || 0;
        const nextSeq = maxPo + 1;
        const currentYear = new Date().getFullYear();
        const poNumber = `PO-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

        const newPoData = {
            ...poData,
            po_number: poNumber,
            status: poData.status || 'Open',
            total_amount: poData.total_amount || 0
        };

        const purchaseOrder = await purchase_orders.create(newPoData, { transaction });

        if (items && Array.isArray(items) && items.length > 0) {
            const poItemsData = items.map(item => ({
                ...item,
                po_id: purchaseOrder.po_id
            }));
            await po_items.bulkCreate(poItemsData, { transaction });
        }

        await transaction.commit();

        res.status(201).json({
            message: "Purchase Order created successfully",
            data: purchaseOrder
        });
    } catch (error) {
        if (transaction) {
            await transaction.rollback();
        }
        res.status(500).json({ error: error.message });
    }
};

// GET All Purchase Orders
exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await purchase_orders.findAll();

        res.status(200).json(purchaseOrders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET Purchase Order by ID
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const poId = parseInt(req.params.id, 10);
        if (isNaN(poId)) {
            return res.status(400).json({ message: "Invalid Purchase Order ID" });
        }
        
        const purchaseOrder = await purchase_orders.findByPk(poId);

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        res.status(200).json(purchaseOrder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE Purchase Order
exports.updatePurchaseOrder = async (req, res) => {
    try {
        const poId = parseInt(req.params.id, 10);
        if (isNaN(poId)) {
            return res.status(400).json({ message: "Invalid Purchase Order ID" });
        }
        
        const purchaseOrder = await purchase_orders.findByPk(poId);

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        await purchaseOrder.update(req.body);

        res.status(200).json({
            message: "Purchase Order updated successfully",
            data: purchaseOrder
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// CANCEL Purchase Order
exports.cancelPurchaseOrder = async (req, res) => {
    try {
        const poId = parseInt(req.params.id, 10);
        if (isNaN(poId)) {
            return res.status(400).json({ message: "Invalid Purchase Order ID" });
        }

        const purchaseOrder = await purchase_orders.findByPk(poId);

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        // Check if order can be cancelled
        if (purchaseOrder.status === 'Received') {
            return res.status(400).json({ error: "Cannot cancel a received order" });
        }

        await purchaseOrder.update({
            status: 'Cancelled',
            notes: req.body.notes || purchaseOrder.notes
        });

        res.status(200).json({
            message: "Purchase Order cancelled successfully",
            data: purchaseOrder
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// EXPORT Purchase Order as PDF
exports.exportPurchaseOrderPDF = async (req, res) => {
    try {
        const poId = parseInt(req.params.id, 10);
        if (isNaN(poId)) {
            return res.status(400).json({ message: "Invalid Purchase Order ID" });
        }

        const purchaseOrder = await purchase_orders.findByPk(poId, {
            include: [
                {
                    model: require('../models').suppliers,
                    as: 'supplier',
                    attributes: ['supplier_name', 'contact', 'address']
                },
                {
                    model: po_items,
                    as: 'po_items',
                    attributes: ['quantity', 'unit_price', 'total_price'],
                    include: [{
                        model: require('../models').products,
                        as: 'product',
                        attributes: ['product_name', 'type', 'batch_no']
                    }]
                }
            ]
        });

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        // Generate HTML for PDF
        const htmlContent = generatePurchaseOrderHTML(purchaseOrder);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="PO-${purchaseOrder.po_number}.pdf"`);

        // For now, return HTML. In production, use puppeteer or similar to convert to PDF
        // This is a placeholder - you'll need to install puppeteer and set it up properly
        res.send(`
            <html>
            <head>
                <title>Purchase Order ${purchaseOrder.po_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .info div { flex: 1; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
                </style>
            </head>
            <body>
                ${htmlContent}
                <p style="margin-top: 40px; font-size: 12px; color: #666;">
                    This is a preview. For production, implement proper PDF generation with puppeteer or similar library.
                </p>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('PDF Export Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Helper function to generate HTML content for PDF
function generatePurchaseOrderHTML(po) {
    const itemsHtml = po.po_items.map(item => `
        <tr>
            <td>${item.product.product_name}</td>
            <td>${item.product.type || '-'}</td>
            <td>${item.product.batch_no || '-'}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">LKR${Number(item.unit_price).toFixed(2)}</td>
            <td style="text-align: right;">LKR${Number(item.total_price).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <div class="header">
            <h1>Purchase Order</h1>
            <h2>${po.po_number}</h2>
        </div>

        <div class="info">
            <div>
                <strong>Supplier:</strong><br>
                ${po.supplier.supplier_name}<br>
                ${po.supplier.contact}<br>
                ${po.supplier.address || ''}
            </div>
            <div style="text-align: right;">
                <strong>Order Date:</strong> ${new Date(po.po_date).toLocaleDateString()}<br>
                <strong>Expected Delivery:</strong> ${po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : 'Not specified'}<br>
                <strong>Status:</strong> ${po.status}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th>Batch No</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="total">
            Grand Total: LKR${Number(po.total_amount).toFixed(2)}
        </div>

        ${po.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong><br>${po.notes}</div>` : ''}
    `;
}

// DELETE Purchase Order
exports.deletePurchaseOrder = async (req, res) => {
    try {
        const poId = parseInt(req.params.id, 10);
        if (isNaN(poId)) {
            return res.status(400).json({ message: "Invalid Purchase Order ID" });
        }

        const purchaseOrder = await purchase_orders.findByPk(poId);

        if (!purchaseOrder) {
            return res.status(404).json({ message: "Purchase Order not found" });
        }

        await purchaseOrder.destroy();

        res.status(200).json({
            message: "Purchase Order deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
