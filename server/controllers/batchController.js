const {
  batch_inventory,
  products,
  purchase_orders,
  po_items,
  suppliers,
  alerts,
  expired_stock_disposals,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const { getStoreLocalDate, syncProductFromBatches, refreshBatchStatuses } = require('../services/batchService');
const {
  EXPIRED_BATCH_ALERT,
  reconcilePurchaseOrderedAlertsAfterReceipt,
  syncAlertsForProduct,
} = require('../services/alertService');

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
    const purchaseOrderFullyReceived = allItemsReceived.every(Boolean);
    if (purchaseOrderFullyReceived && po.status !== 'Received') {
      await po.update({
        status: 'Received',
        actual_delivery_date: getStoreLocalDate(),
      }, { transaction });

      for (const receivedProductId of new Set(po.po_items.map(item => Number(item.product_id)))) {
        await reconcilePurchaseOrderedAlertsAfterReceipt(receivedProductId, po_id, transaction);
      }
    }

    await transaction.commit();

    const affectedProductIds = purchaseOrderFullyReceived
      ? new Set(po.po_items.map(item => Number(item.product_id)))
      : new Set([Number(product_id)]);
    for (const affectedProductId of affectedProductIds) {
      const updatedProduct = await products.findByPk(affectedProductId);
      if (updatedProduct) {
        try {
          await syncAlertsForProduct(updatedProduct);
        } catch (error) {
          console.error(`[Batch Receive] Alert sync failed for product ${affectedProductId}: ${error.message}`);
        }
      }
    }
    const io = req.app.get('io');
    if (io) io.emit('products:updated');
    if (io) io.emit('alerts:updated');

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
  const body = req.body || {};
  const quantity = Number(body.quantity);
  const disposalDate = body.disposal_date || getStoreLocalDate();
  const disposalReason = String(body.disposal_reason || '').trim();
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Disposal quantity must be a positive whole number.' });
  }
  if (!isDateOnly(disposalDate)) {
    return res.status(400).json({ error: 'Disposal date is required in YYYY-MM-DD format.' });
  }
  if (!disposalReason) {
    return res.status(400).json({ error: 'Disposal reason is required.' });
  }

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const batch = await batch_inventory.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!batch) {
      const error = new Error('Batch not found.');
      error.statusCode = 404;
      throw error;
    }
    if (!batch.expiry_date || batch.expiry_date >= getStoreLocalDate()) {
      const error = new Error('Only expired batches can be disposed.');
      error.statusCode = 400;
      throw error;
    }
    const remaining = Number(batch.remaining_quantity);
    if (remaining <= 0 || quantity > remaining) {
      const error = new Error(`Disposal quantity must not exceed the remaining batch quantity (${remaining}).`);
      error.statusCode = 400;
      throw error;
    }

    const product = await products.findByPk(batch.product_id, { transaction });
    if (!product) {
      const error = new Error('Batch product not found.');
      error.statusCode = 404;
      throw error;
    }

    const remainingQuantity = remaining - quantity;
    await batch.update({
      remaining_quantity: remainingQuantity,
      status: remainingQuantity === 0 ? 'Disposed' : 'Expired',
      disposed_at: remainingQuantity === 0 ? new Date() : null,
    }, { transaction });
    const disposal = await expired_stock_disposals.create({
      batch_id: batch.batch_id,
      product_name: product.product_name,
      batch_number: batch.batch_number,
      expired_quantity: quantity,
      disposal_date: disposalDate,
      disposal_reason: disposalReason,
    }, { transaction });

    const expiredAlert = await alerts.findOne({
      where: { batch_id: batch.batch_id, alert_type: EXPIRED_BATCH_ALERT },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (expiredAlert) {
      if (remainingQuantity === 0) {
        await expiredAlert.update({
          is_resolved: true,
          resolved_date: new Date(),
          status: 'Resolved',
        }, { transaction });
      } else {
        await expiredAlert.update({
          is_resolved: false,
          resolved_date: null,
          status: 'Active',
        }, { transaction });
      }
    }
    await syncProductFromBatches(batch.product_id, transaction);
    const updatedProduct = await products.findByPk(batch.product_id, { transaction });
    await transaction.commit();

    if (updatedProduct) await syncAlertsForProduct(updatedProduct);
    const io = req.app.get('io');
    if (io) io.emit('products:updated');
    if (io) io.emit('alerts:updated');
    res.json({ message: 'Expired stock disposal recorded successfully.', batch, disposal });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

// GET /api/batch-inventory/disposals
exports.getDisposalHistory = async (req, res) => {
  try {
    const where = {};
    if (req.query.batch_id) {
      if (!Number.isInteger(Number(req.query.batch_id)) || Number(req.query.batch_id) <= 0) {
        return res.status(400).json({ error: 'Batch ID must be a positive integer.' });
      }
      where.batch_id = Number(req.query.batch_id);
    }
    const history = await expired_stock_disposals.findAll({
      where,
      order: [['disposal_date', 'DESC'], ['disposal_id', 'DESC']],
    });
    res.json(history);
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
