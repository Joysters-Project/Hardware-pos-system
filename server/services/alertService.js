const { alerts, products, batch_inventory, purchase_orders, po_items } = require('../models');
const { Op } = require('sequelize');
const { getStoreLocalDate } = require('./batchService');

const NEAR_EXPIRY_DAYS = 30;
const EXPIRED_BATCH_ALERT = 'Expired';
const ALL_TYPES = ['Out of Stock', 'Low Stock', 'Reorder', 'Near Expiry'];

function getApplicableStockAlertTypes(product) {
  const stock   = parseInt(product.stock_quantity)     || 0;
  const minQty  = parseInt(product.min_stock_quantity) || 0;
  const reorder = parseInt(product.reorder_level)      || 0;

  if (stock === 0) {
    return ['Out of Stock'];
  }
  if (stock > 0 && stock <= minQty) return ['Low Stock'];
  if (stock === reorder) return ['Reorder'];
  return [];
}

function getApplicableTypes(product, nearestBatchExpiry) {
  const types = getApplicableStockAlertTypes(product);

  // Expiry alerts — use nearest batch expiry, fallback to product.expiry_date
  const expiryDate = nearestBatchExpiry || product.expiry_date;
  if (expiryDate) {
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const expiry   = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0 && daysLeft <= NEAR_EXPIRY_DAYS) {
      types.push('Near Expiry');
    }
  }

  return types;
}

async function reconcilePurchaseOrderedAlertsAfterReceipt(productId, purchaseOrderId, transaction) {
  const product = await products.findByPk(productId, { transaction });
  if (!product) return;

  const otherOpenOrders = await purchase_orders.findAll({
    attributes: ['po_id'],
    where: {
      po_id: { [Op.ne]: purchaseOrderId },
      status: { [Op.notIn]: ['Received', 'Cancelled'] },
    },
    include: [{
      model: po_items,
      attributes: ['product_id'],
      where: { product_id: productId },
      required: true,
    }],
    transaction,
  });
  const otherOpenOrderIds = new Set(otherOpenOrders.map(order => Number(order.po_id)));
  const applicableStockTypes = new Set(getApplicableStockAlertTypes(product));
  const orderedAlerts = await alerts.findAll({
    where: {
      product_id: productId,
      alert_type: { [Op.in]: ['Out of Stock', 'Low Stock', 'Reorder'] },
      status: 'Purchase Ordered',
      is_resolved: false,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  for (const alert of orderedAlerts) {
    if (!applicableStockTypes.has(alert.alert_type)) {
      await alert.update({
        is_resolved: true,
        resolved_date: new Date(),
        status: 'Resolved',
        purchase_order_id: null,
      }, { transaction });
    } else if (!otherOpenOrderIds.size) {
      await alert.update({
        status: 'Active',
        resolved_date: null,
        purchase_order_id: null,
      }, { transaction });
    } else if (!otherOpenOrderIds.has(Number(alert.purchase_order_id))) {
      await alert.update({
        purchase_order_id: otherOpenOrderIds.values().next().value,
      }, { transaction });
    }
  }
}

// Get the nearest expiry date from batches with remaining stock (any non-Disposed status)
async function getNearestBatchExpiry(productId) {
  if (!batch_inventory) return null;
  const batch = await batch_inventory.findOne({
    where: {
      product_id: productId,
      remaining_quantity: { [Op.gt]: 0 },
      expiry_date: { [Op.ne]: null },
      status: { [Op.notIn]: ['Disposed'] },
    },
    order: [['expiry_date', 'ASC']],
  }).catch(() => null);
  return batch?.expiry_date || null;
}

async function syncExpiredBatchAlerts(productId, transaction = null) {
  if (!batch_inventory) return { created: 0, resolved: 0 };
  const today = getStoreLocalDate();
  const options = transaction ? { transaction } : {};
  const expiredBatches = await batch_inventory.findAll({
    where: {
      product_id: productId,
      expiry_date: { [Op.lt]: today },
      remaining_quantity: { [Op.gt]: 0 },
    },
    ...options,
  });
  const activeBatchIds = new Set(expiredBatches.map(batch => Number(batch.batch_id)));
  let created = 0;
  let resolved = 0;

  for (const batch of expiredBatches) {
    const alert = await alerts.findOne({
      where: { batch_id: batch.batch_id, alert_type: EXPIRED_BATCH_ALERT },
      ...options,
    });
    if (!alert) {
      await alerts.create({
        product_id: Number(productId),
        batch_id: batch.batch_id,
        alert_type: EXPIRED_BATCH_ALERT,
        is_resolved: false,
        status: 'Active',
      }, options);
      created += 1;
    } else if (alert.is_resolved || alert.status !== 'Active') {
      await alert.update({
        is_resolved: false,
        resolved_date: null,
        status: 'Active',
      }, options);
    }
  }

  const existingAlerts = await alerts.findAll({
    where: {
      product_id: productId,
      alert_type: EXPIRED_BATCH_ALERT,
      batch_id: { [Op.ne]: null },
      is_resolved: false,
    },
    ...options,
  });
  for (const alert of existingAlerts) {
    if (!activeBatchIds.has(Number(alert.batch_id))) {
      await alert.update({
        is_resolved: true,
        resolved_date: new Date(),
        status: 'Resolved',
      }, options);
      resolved += 1;
    }
  }

  const [legacyResolved] = await alerts.update(
    { is_resolved: true, resolved_date: new Date(), status: 'Resolved' },
    {
      where: { product_id: productId, alert_type: 'Expired', batch_id: null, is_resolved: false },
      ...options,
    }
  );
  resolved += legacyResolved;
  return { created, resolved };
}

async function syncAlertsForProduct(product) {
  try {
    const nearestBatchExpiry = await getNearestBatchExpiry(product.product_id);
    const applicable = getApplicableTypes(product, nearestBatchExpiry);

    for (const alert_type of applicable) {
      const exists = await alerts.findOne({
        where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Active' }
      });
      if (!exists) {
        // Don't create a duplicate if a Purchase Ordered alert already exists for this type
        const poAlert = await alerts.findOne({
          where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Purchase Ordered' }
        });
        if (!poAlert) {
          await alerts.create({ product_id: product.product_id, alert_type, is_resolved: false });
        }
      }
    }

    const toResolve = ALL_TYPES.filter(t => !applicable.includes(t));
    for (const alert_type of toResolve) {
      await alerts.update(
        { is_resolved: true, resolved_date: new Date(), status: 'Resolved' },
        { where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Active' } }
      );
    }
    await syncExpiredBatchAlerts(product.product_id);
  } catch (err) {
    console.warn(`[AlertService] syncAlertsForProduct failed for product ${product.product_id}:`, err.message);
  }
}

async function generateAllAlerts() {
  const allProducts = await products.findAll({
    attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'expiry_date']
  });

  let created = 0;
  let autoResolved = 0;

  for (const product of allProducts) {
    const nearestBatchExpiry = await getNearestBatchExpiry(product.product_id);
    const applicable = getApplicableTypes(product, nearestBatchExpiry);

    for (const alert_type of applicable) {
      const exists = await alerts.findOne({
        where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Active' }
      });
      if (!exists) {
        const poAlert = await alerts.findOne({
          where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Purchase Ordered' }
        });
        if (!poAlert) {
          await alerts.create({ product_id: product.product_id, alert_type, is_resolved: false });
          created++;
        }
      }
    }

    const toResolve = ALL_TYPES.filter(t => !applicable.includes(t));
    for (const alert_type of toResolve) {
      const [count] = await alerts.update(
        { is_resolved: true, resolved_date: new Date(), status: 'Resolved' },
        { where: { product_id: product.product_id, alert_type, is_resolved: false, status: 'Active' } }
      );
      autoResolved += count;
    }
    const expiredBatchAlerts = await syncExpiredBatchAlerts(product.product_id);
    created += expiredBatchAlerts.created;
    autoResolved += expiredBatchAlerts.resolved;
  }

  return { productsScanned: allProducts.length, alertsCreated: created, alertsAutoResolved: autoResolved };
}

module.exports = {
  EXPIRED_BATCH_ALERT,
  getApplicableStockAlertTypes,
  reconcilePurchaseOrderedAlertsAfterReceipt,
  syncAlertsForProduct,
  syncExpiredBatchAlerts,
  generateAllAlerts,
};
