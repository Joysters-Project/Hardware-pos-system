const { purchase_orders, po_items, suppliers } = require('../models');

// CREATE Purchase Order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await purchase_orders.create(req.body);

    res.status(201).json({
      message: "Purchase Order created successfully",
      data: purchaseOrder
    });
  } catch (error) {
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

// GET Purchase Order for Product
exports.getPurchaseOrderByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const purchaseOrder = await purchase_orders.findOne({
      include: [
        {
          model: po_items,
          where: { product_id: productId },
          required: true
        },
        {
          model: suppliers,
          required: false
        }
      ],
      order: [[ 'po_date', 'DESC' ]]
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'No purchase order found for this product' });
    }

    res.status(200).json({
      po_id: purchaseOrder.po_id,
      supplier_id: purchaseOrder.supplier_id,
      supplier_name: purchaseOrder.supplier?.supplier_name || null,
      po_date: purchaseOrder.po_date,
      status: purchaseOrder.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Purchase Order by ID
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await purchase_orders.findByPk(req.params.id);

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
    const purchaseOrder = await purchase_orders.findByPk(req.params.id);

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
    const purchaseOrder = await purchase_orders.findByPk(req.params.id);

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