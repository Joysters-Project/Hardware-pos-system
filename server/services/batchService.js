const db = require('../models');
const { batch_inventory, products } = db;
const { Op } = require('sequelize');

/**
 * Recalculate and persist product stock_quantity and expiry_date
 * from active batches. Call after any batch change.
 */
async function syncProductFromBatches(productId) {
  const activeBatches = await batch_inventory.findAll({
    where: { product_id: productId, status: { [Op.in]: ['Active', 'Low Stock'] }, remaining_quantity: { [Op.gt]: 0 } },
  });

  const totalStock = activeBatches.reduce((s, b) => s + (b.remaining_quantity || 0), 0);

  // Nearest expiry among active batches with remaining qty (FEFO)
  const withExpiry = activeBatches.filter(b => b.expiry_date);
  withExpiry.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  const nearestExpiry = withExpiry.length > 0 ? withExpiry[0].expiry_date : null;

  // Step 6: derive product status from stock vs min_stock
  const product = await products.findByPk(productId);
  let newStatus = product?.status || 'active';
  if (product) {
    const minQty = parseInt(product.min_stock_quantity) || 0;
    const currentStatus = (product.status || '').toLowerCase();
    // Only manage Active/Low Stock transitions; leave Discontinued etc. untouched
    if (['active', 'low stock'].includes(currentStatus)) {
      newStatus = totalStock <= minQty ? 'Low Stock' : 'active';
    }
  }

  await products.update(
    { stock_quantity: totalStock, expiry_date: nearestExpiry, status: newStatus },
    { where: { product_id: productId } }
  );
}

/**
 * Refresh batch statuses (Expired, Low Stock) for a product then sync product.
 */
async function refreshBatchStatuses(productId) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const batches = await batch_inventory.findAll({
    where: { product_id: productId, status: { [Op.notIn]: ['Disposed'] } },
  });

  for (const batch of batches) {
    if (batch.status === 'Disposed') continue;
    const expired = batch.expiry_date && new Date(batch.expiry_date) < today;
    let newStatus;
    if (expired) {
      newStatus = 'Expired';
    } else if (batch.remaining_quantity <= 0) {
      newStatus = 'Expired'; // treat zero-qty as expired for display
    } else {
      newStatus = 'Active';
    }
    if (batch.status !== newStatus) {
      await batch.update({ status: newStatus });
    }
  }

  await syncProductFromBatches(productId);
}

/**
 * Generate next batch number: BATCH-NNNNNN
 */
async function generateBatchNumber() {
  const last = await batch_inventory.findOne({ order: [['batch_id', 'DESC']] });
  const next = last ? last.batch_id + 1 : 1;
  return `BATCH-${String(next).padStart(6, '0')}`;
}

/**
 * Create a batch from a received PO item.
 */
async function createBatchFromPOItem({ productId, purchaseOrderId, supplierId, purchasePrice, quantity, expiryDate, receivedDate }) {
  const batchNumber = await generateBatchNumber();
  const batch = await batch_inventory.create({
    batch_number: batchNumber,
    product_id: productId,
    purchase_order_id: purchaseOrderId,
    supplier_id: supplierId,
    purchase_price: purchasePrice || 0,
    received_quantity: quantity,
    remaining_quantity: quantity,
    received_date: receivedDate || new Date().toISOString().split('T')[0],
    expiry_date: expiryDate || null,
    status: 'Active',
  });
  await syncProductFromBatches(productId);
  return batch;
}

/**
 * Deduct stock using FEFO (First Expire First Out).
 * Returns array of { batch_id, deducted } or throws if insufficient stock.
 */
async function deductStockFEFO(productId, quantityNeeded) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Active batches with remaining qty, sorted by expiry ASC (nulls last)
  const batches = await batch_inventory.findAll({
    where: {
      product_id: productId,
      status: { [Op.in]: ['Active', 'Low Stock'] },
      remaining_quantity: { [Op.gt]: 0 },
    },
    order: [
      [batch_inventory.sequelize.literal(`CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END`), 'ASC'],
      ['expiry_date', 'ASC'],
    ],
  });

  const totalAvailable = batches.reduce((s, b) => s + b.remaining_quantity, 0);
  if (totalAvailable < quantityNeeded) {
    throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantityNeeded}`);
  }

  const deductions = [];
  let remaining = quantityNeeded;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.remaining_quantity, remaining);
    const newQty = batch.remaining_quantity - deduct;
    // Mark zero-qty batch as Expired (sold out) so it is excluded from FEFO and alerts
    const newStatus = newQty <= 0 ? 'Expired' : 'Active';
    await batch.update({ remaining_quantity: newQty, status: newStatus });
    deductions.push({ batch_id: batch.batch_id, batch_number: batch.batch_number, deducted: deduct });
    remaining -= deduct;
  }

  await syncProductFromBatches(productId);
  return deductions;
}

module.exports = { syncProductFromBatches, refreshBatchStatuses, generateBatchNumber, createBatchFromPOItem, deductStockFEFO };
