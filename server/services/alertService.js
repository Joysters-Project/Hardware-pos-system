const { alerts, products } = require('../models');

const NEAR_EXPIRY_DAYS = 7;
const ALL_TYPES = ['Out of Stock', 'Low Stock', 'Reorder', 'Near Expiry'];

// Strict priority-based classification — a product belongs to exactly ONE category
function getApplicableTypes(product) {
  const types   = [];
  const stock   = parseInt(product.stock_quantity)     || 0;
  const minQty  = parseInt(product.min_stock_quantity) || 0;
  const reorder = parseInt(product.reorder_level)      || 0;

  // Mutually exclusive — evaluated in priority order
  if (stock === 0) {
    types.push('Out of Stock');
  } else if (stock > 0 && stock < minQty) {
    types.push('Low Stock');
  } else if (stock === reorder) {
    types.push('Reorder');
  }

  // Near Expiry is independent of stock level
  if (product.expiry_date) {
    const daysLeft = Math.ceil(
      (new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft >= 0 && daysLeft <= NEAR_EXPIRY_DAYS) types.push('Near Expiry');
  }

  return types;
}

// Called after a single product is created or updated
async function syncAlertsForProduct(product) {
  try {
    const applicable = getApplicableTypes(product);

    for (const alert_type of applicable) {
      const exists = await alerts.findOne({
        where: { product_id: product.product_id, alert_type, is_resolved: false }
      });
      if (!exists) {
        await alerts.create({ product_id: product.product_id, alert_type, is_resolved: false });
      }
    }

    const toResolve = ALL_TYPES.filter(t => !applicable.includes(t));
    for (const alert_type of toResolve) {
      await alerts.update(
        { is_resolved: true, resolved_date: new Date() },
        { where: { product_id: product.product_id, alert_type, is_resolved: false } }
      );
    }
  } catch (err) {
    console.warn(`[AlertService] syncAlertsForProduct failed for product ${product.product_id}:`, err.message);
  }
}

// Full scan — called by GET /api/alerts/generate
async function generateAllAlerts() {
  const allProducts = await products.findAll({
    attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'expiry_date']
  });

  let created = 0;
  let autoResolved = 0;

  for (const product of allProducts) {
    const applicable = getApplicableTypes(product);

    for (const alert_type of applicable) {
      const exists = await alerts.findOne({
        where: { product_id: product.product_id, alert_type, is_resolved: false }
      });
      if (!exists) {
        await alerts.create({ product_id: product.product_id, alert_type, is_resolved: false });
        created++;
      }
    }

    const toResolve = ALL_TYPES.filter(t => !applicable.includes(t));
    for (const alert_type of toResolve) {
      const [count] = await alerts.update(
        { is_resolved: true, resolved_date: new Date() },
        { where: { product_id: product.product_id, alert_type, is_resolved: false } }
      );
      autoResolved += count;
    }
  }

  return { productsScanned: allProducts.length, alertsCreated: created, alertsAutoResolved: autoResolved };
}

module.exports = { syncAlertsForProduct, generateAllAlerts };
