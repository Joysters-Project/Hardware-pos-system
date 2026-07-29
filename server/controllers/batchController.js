const { batch_inventory, products, purchase_orders, po_items, suppliers } = require('../models');
const { Op } = require('sequelize');
const { syncProductFromBatches, refreshBatchStatuses } = require('../services/batchService');
const { syncAlertsForProduct } = require('../services/alertService');

// POST /api/batch-inventory/receive
// Body: { po_id, po_item_id, product_id, supplier_batch_number, expiry_date, received_date, received_quantity }
exports.receiveOrderItem = async (req, res) => {
  try {
    const { po_id, po_item_id, product_id, supplier_batch_number, expiry_date, received_date, received_quantity } = req.body;

    // --- Validation ---
    if (!supplier_batch_number?.trim())
      return res.status(400).json({ error: 'Supplier Batch Number is required.' });
    if (!expiry_date)
      return res.status(400).json({ error: 'Expiry Date is required.' });
    if (!received_quantity || Number(received_quantity) <= 0)
      return res.status(400).json({ error: 'Received Quantity must be greater than zero.' });

    // Duplicate batch number check for same product
    const duplicate = await batch_inventory.findOne({
      where: { product_id, batch_number: supplier_batch_number.trim() },
    });
    if (duplicate)
      return res.status(400).json({ error: `Batch number "${supplier_batch_number.trim()}" already exists for this product.` });

    // Fetch PO and item
    const po = await purchase_orders.findByPk(po_id, { include: [{ model: po_items }] });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });

    const poItem = po.po_items?.find(i => i.id === Number(po_item_id));
    if (!poItem) return res.status(404).json({ error: 'PO line item not found.' });

    // Check already-received quantity for this PO item
    const alreadyReceived = await batch_inventory.sum('received_quantity', {
      where: { product_id, purchase_order_id: po_id },
    }) || 0;
    const remaining = poItem.quantity - alreadyReceived;
    if (Number(received_quantity) > remaining)
      return res.status(400).json({ error: `Received Quantity (${received_quantity}) exceeds remaining PO quantity (${remaining}).` });

    // --- Create Batch ---
    const batch = await batch_inventory.create({
      batch_number:      supplier_batch_number.trim(),
      product_id,
      purchase_order_id: po_id,
      supplier_id:       po.supplier_id,
      purchase_price:    poItem.unit_price,
      received_quantity: Number(received_quantity),
      remaining_quantity: Number(received_quantity),
      received_date:     received_date || new Date().toISOString().split('T')[0],
      expiry_date,
      status: 'Active',
    });

    // --- Sync product stock + expiry ---
    await syncProductFromBatches(product_id);

    // --- Sync alerts ---
    const updatedProduct = await products.findByPk(product_id);
    if (updatedProduct) await syncAlertsForProduct(updatedProduct).catch(() => {});

    // --- Mark PO as Received if all items fully received ---
    const totalOrdered = po.po_items.reduce((s, i) => s + i.quantity, 0);
    const totalReceivedNow = (await batch_inventory.sum('received_quantity', {
      where: { purchase_order_id: po_id },
    })) || 0;

    if (totalReceivedNow >= totalOrdered && po.status !== 'Received') {
      await po.update({
        status: 'Received',
        actual_delivery_date: new Date().toISOString().split('T')[0],
      });
    }

    res.status(201).json({ message: 'Order received and batch created successfully.', batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/batch-inventory
exports.getAllBatches = async (req, res) => {
  try {
    const batches = await batch_inventory.findAll({
      include: [
        { model: products,        attributes: ['product_id', 'product_name'] },
        { model: purchase_orders, attributes: ['po_id', 'po_number'] },
        { model: suppliers,       attributes: ['supplier_id', 'supplier_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/batch-inventory/product/:productId
exports.getBatchesByProduct = async (req, res) => {
  try {
    const batches = await batch_inventory.findAll({
      where: { product_id: req.params.productId },
      include: [
        { model: purchase_orders, attributes: ['po_id', 'po_number'] },
        { model: suppliers,       attributes: ['supplier_id', 'supplier_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/batch-inventory/:id
exports.getBatchById = async (req, res) => {
  try {
    const batch = await batch_inventory.findByPk(req.params.id, {
      include: [
        { model: products,        attributes: ['product_id', 'product_name'] },
        { model: purchase_orders, attributes: ['po_id', 'po_number'] },
        { model: suppliers,       attributes: ['supplier_id', 'supplier_name'] },
      ],
    });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/batch-inventory/:id/dispose
exports.disposeBatch = async (req, res) => {
  try {
    const batch = await batch_inventory.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    if (batch.status !== 'Expired') {
      return res.status(400).json({ error: 'Only Expired batches can be disposed' });
    }
    await batch.update({ status: 'Disposed', remaining_quantity: 0, disposed_at: new Date() });
    await syncProductFromBatches(batch.product_id);
    res.json({ message: 'Batch disposed successfully', batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/batch-inventory/refresh-statuses
exports.refreshAllStatuses = async (req, res) => {
  try {
    const allProductIds = await batch_inventory.findAll({
      attributes: [[batch_inventory.sequelize.fn('DISTINCT', batch_inventory.sequelize.col('product_id')), 'product_id']],
      raw: true,
    });
    for (const row of allProductIds) {
      await refreshBatchStatuses(row.product_id);
    }
    res.json({ message: 'Batch statuses refreshed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
