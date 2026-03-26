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
