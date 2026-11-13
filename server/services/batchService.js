const { batch_inventory, products } = require('../models');
const { Op } = require('sequelize');

function getStoreLocalDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function getProductBatchSummaries(productIds, transaction = null) {
  if (!productIds.length) return new Map();

  const batches = await batch_inventory.findAll({
    where: {
      product_id: { [Op.in]: productIds },
    },
    order: [
      [batch_inventory.sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
      ['expiry_date', 'ASC'],
      ['batch_id', 'ASC'],
    ],
    ...(transaction ? { transaction } : {}),
  });

  const today = getStoreLocalDate();
  const summaries = new Map();
  for (const batch of batches) {
    const productId = Number(batch.product_id);
    let summary = summaries.get(productId);
    if (!summary) {
      summary = {
        stock_quantity: 0,
        batch_no: null,
        batch_number: null,
        expiry_date: null,
        has_batches: true,
      };
      summaries.set(productId, summary);
    }
    const isSellable = batch.status !== 'Disposed' &&
      Number(batch.remaining_quantity) > 0 &&
      (!batch.expiry_date || batch.expiry_date >= today);
    if (isSellable) {
      summary.stock_quantity += Number(batch.remaining_quantity);
      if (!summary.batch_number) {
        summary.batch_no = batch.batch_number;
        summary.batch_number = batch.batch_number;
        summary.expiry_date = batch.expiry_date || null;
      }
    }
  }
  return summaries;
}

/**
 * Recalculate product-level stock and active-batch fields from sellable batches.
 */
async function syncProductFromBatches(productId, transaction = null) {
  const txOpt = transaction ? { transaction } : {};
  const summaries = await getProductBatchSummaries([Number(productId)], transaction);
  const summary = summaries.get(Number(productId));
  const totalStock = summary?.stock_quantity || 0;

  const product = await products.findByPk(productId, txOpt);
  let newStatus = product?.status || 'active';
  if (product) {
    const minQty = parseInt(product.min_stock_quantity, 10) || 0;
    const currentStatus = (product.status || '').toLowerCase();
    if (['active', 'low stock'].includes(currentStatus)) {
      newStatus = totalStock <= minQty ? 'Low Stock' : 'active';
    }
  }

  await products.update(
    {
      stock_quantity: totalStock,
      expiry_date: summary?.expiry_date || null,
      batch_no: summary?.batch_no || null,
      status: newStatus,
    },
    { where: { product_id: productId }, ...txOpt }
  );
}

/**
 * Refresh batch statuses (Expired, Low Stock) for a product then sync product.
 */
async function refreshBatchStatuses(productId) {
  const today = getStoreLocalDate();
  const batches = await batch_inventory.findAll({
    where: { product_id: productId, status: { [Op.notIn]: ['Disposed'] } },
  });

  for (const batch of batches) {
    if (batch.status === 'Disposed') continue;
    const expired = batch.expiry_date && batch.expiry_date < today;
    let newStatus;
    if (expired) {
      newStatus = 'Expired';
    } else if (batch.remaining_quantity <= 0) {
      newStatus = batch.status;
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
async function createBatchFromPOItem({
  productId,
  purchaseOrderId,
  supplierId,
  purchasePrice,
  quantity,
  expiryDate,
  receivedDate,
  transaction = null,
}) {
  const batchNumber = await generateBatchNumber();
  const batch = await batch_inventory.create({
    batch_number: batchNumber,
    product_id: productId,
    purchase_order_id: purchaseOrderId,
    supplier_id: supplierId,
    purchase_price: purchasePrice || 0,
    received_quantity: quantity,
    remaining_quantity: quantity,
    received_date: receivedDate || getStoreLocalDate(),
    expiry_date: expiryDate || null,
    status: 'Active',
  }, transaction ? { transaction } : {});
  await syncProductFromBatches(productId, transaction);
  return batch;
}

/**
 * Deduct stock using FEFO (First Expire First Out).
 * Returns an array of { batch_id, batch_number, deducted }.
 */
async function deductStockFEFO(productId, quantityNeeded, transaction = null) {
  const quantity = Number(quantityNeeded);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Sale quantity must be greater than zero.');
  }

  const today = getStoreLocalDate();
  const existingBatch = await batch_inventory.findOne({
    where: { product_id: productId },
    ...(transaction ? { transaction } : {}),
  });
  if (!existingBatch) {
    const product = await products.findByPk(productId, transaction ? { transaction } : {});
    const openingQuantity = Number(product?.stock_quantity) || 0;
    if (openingQuantity > 0) {
      const expiryDate = product.expiry_date ? String(product.expiry_date).slice(0, 10) : null;
      await batch_inventory.create({
        batch_number: product.batch_no || `OPENING-${productId}`,
        product_id: productId,
        purchase_order_id: null,
        supplier_id: null,
        purchase_price: Number(product.cost_price) || 0,
        received_quantity: openingQuantity,
        remaining_quantity: openingQuantity,
        received_date: today,
        expiry_date: expiryDate,
        status: expiryDate && expiryDate < today ? 'Expired' : 'Active',
      }, transaction ? { transaction } : {});
    }
  }

  const batches = await batch_inventory.findAll({
    where: {
      product_id: productId,
      status: { [Op.notIn]: ['Disposed'] },
      remaining_quantity: { [Op.gt]: 0 },
      [Op.or]: [
        { expiry_date: null },
        { expiry_date: { [Op.gte]: today } },
      ],
    },
    order: [
      [batch_inventory.sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
      ['expiry_date', 'ASC'],
      ['batch_id', 'ASC'],
    ],
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });

  const totalAvailable = batches.reduce((sum, batch) => sum + Number(batch.remaining_quantity), 0);
  if (totalAvailable < quantity) {
    const expiredStock = await batch_inventory.sum('remaining_quantity', {
      where: {
        product_id: productId,
        remaining_quantity: { [Op.gt]: 0 },
        expiry_date: { [Op.lt]: today },
        status: { [Op.notIn]: ['Disposed'] },
      },
      ...(transaction ? { transaction } : {}),
    }) || 0;

    if (totalAvailable === 0 && expiredStock > 0) {
      throw new Error('This product batch has expired. Sales are not allowed.');
    }
    throw new Error(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
  }

  const deductions = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deducted = Math.min(Number(batch.remaining_quantity), remaining);
    await batch.update(
      { remaining_quantity: Number(batch.remaining_quantity) - deducted },
      transaction ? { transaction } : {}
    );
    deductions.push({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      deducted,
    });
    remaining -= deducted;
  }

  await syncProductFromBatches(productId, transaction);
  return deductions;
}

module.exports = {
  getStoreLocalDate,
  getProductBatchSummaries,
  syncProductFromBatches,
  refreshBatchStatuses,
  generateBatchNumber,
  createBatchFromPOItem,
  deductStockFEFO,
};
