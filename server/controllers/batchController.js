const { batch_inventory, products, purchase_orders, po_items, suppliers, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getStoreLocalDate, syncProductFromBatches, refreshBatchStatuses } = require('../services/batchService');
const { syncAlertsForProduct } = require('../services/alertService');

const isDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// POST /api/batch-inventory/receive
// Body: { po_id, product_id, supplier_batch_number, expiry_date, received_date, received_quantity }
exports.receiveOrderItem = async (req, res) => {
  const { po_id, product_id, supplier_batch_number, expiry_date, received_date, received_quantity } = req.body;

  if (!Number.isInteger(Number(po_id)) || Number(po_id) <= 0 ||
      !Number.isInteger(Number(product_id)) || Number(product_id) <= 0) {
    return res.status(400).json({ error: 'Valid Purchase Order and Product IDs are required.' });
  }
  if (!supplier_batch_number?.trim())
    return res.status(400).json({ error: 'Supplier Batch Number is required.' });
  if (!Number.isFinite(Number(received_quantity)) || Number(received_quantity) <= 0)
    return res.status(400).json({ error: 'Received Quantity must be greater than zero.' });
  if (!isDateOnly(received_date))
    return res.status(400).json({ error: 'Received Date is required in YYYY-MM-DD format.' });
  if (!isDateOnly(expiry_date))
    return res.status(400).json({ error: 'Expiry Date is required in YYYY-MM-DD format.' });
  if (expiry_date < received_date)
    return res.status(400).json({ error: 'Expiry Date cannot be earlier than Received Date.' });

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const po = await purchase_orders.findByPk(po_id, {
      include: [{ model: po_items }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!po) {
      const error = new Error('Purchase Order not found.');
      error.statusCode = 404;
      throw error;
    }
    if (po.status !== 'Shipped') {
      const error = new Error('Only shipped purchase orders can be received.');
      error.statusCode = 400;
      throw error;
    }

    const poItem = po.po_items?.find(i => Number(i.product_id) === Number(product_id));
    if (!poItem) {
      const error = new Error('PO line item not found.');
      error.statusCode = 404;
      throw error;
    }

    const product = await products.findByPk(product_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) {
      const error = new Error('Product not found.');
      error.statusCode = 404;
      throw error;
    }

    const duplicate = await batch_inventory.findOne({
      where: { product_id, batch_number: supplier_batch_number.trim() },
      transaction,
    });
    if (duplicate) {
      const error = new Error(`Batch number "${supplier_batch_number.trim()}" already exists for this product.`);
      error.statusCode = 400;
      throw error;
    }

    const alreadyReceived = await batch_inventory.sum('received_quantity', {
      where: { product_id, purchase_order_id: po_id },
      transaction,
    }) || 0;
    const remaining = Number(poItem.quantity) - Number(alreadyReceived);
    if (Number(received_quantity) > remaining) {
      const error = new Error(`Received Quantity (${received_quantity}) exceeds remaining PO quantity (${remaining}).`);
      error.statusCode = 400;
      throw error;
    }

    const batch = await batch_inventory.create({
      batch_number:      supplier_batch_number.trim(),
      product_id:        Number(product_id),
      purchase_order_id: po_id,
      supplier_id:       po.supplier_id,
      purchase_price:    poItem.unit_price,
      received_quantity: Number(received_quantity),
      remaining_quantity: Number(received_quantity),
      received_date,
      expiry_date,
      status: expiry_date < getStoreLocalDate() ? 'Expired' : 'Active',
    }, { transaction });

    await syncProductFromBatches(Number(product_id), transaction);

    const allItemsReceived = await Promise.all(po.po_items.map(async (item) => {
      const received = await batch_inventory.sum('received_quantity', {
        where: { product_id: item.product_id, purchase_order_id: po_id },
        transaction,
      });
      return Number(received || 0) >= Number(item.quantity);
    }));
    if (allItemsReceived.every(Boolean) && po.status !== 'Received') {
      await po.update({
        status: 'Received',
        actual_delivery_date: getStoreLocalDate(),
      }, { transaction });
    }

    const updatedProduct = await products.findByPk(product_id, { transaction });
    await transaction.commit();

    if (updatedProduct) {
      try {
        await syncAlertsForProduct(updatedProduct);
      } catch (error) {
        console.error(`[Batch Receive] Alert sync failed for product ${product_id}: ${error.message}`);
      }
    }
    const io = req.app.get('io');
    if (io) io.emit('products:updated');

    res.status(201).json({ message: 'Order received and batch created successfully.', batch });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(err.statusCode || 500).json({ error: err.message });
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
    const io = req.app.get('io');
    if (io) io.emit('products:updated');
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
