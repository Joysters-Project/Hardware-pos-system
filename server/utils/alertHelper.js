const { products, alerts } = require('../models');

const ALERT_CHECKS = [
  {
    alert_type: 'Out of Stock',
    shouldCreate: (product) => product.stock_quantity === 0 && product.status?.toLowerCase() === 'active',
    shouldResolve: (product) => product.stock_quantity > 0,
  },
  {
    alert_type: 'Reorder',
    shouldCreate: (product) =>
      product.stock_quantity <= product.reorder_level && product.status?.toLowerCase() === 'active',
    shouldResolve: (product) => product.stock_quantity > product.reorder_level,
  },
  {
    alert_type: 'Low Stock',
    shouldCreate: (product) =>
      product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_quantity && product.status?.toLowerCase() === 'active',
    shouldResolve: (product) => product.stock_quantity === 0 || product.stock_quantity > product.min_stock_quantity,
  },
];

async function checkAndCreateAlert(product_id) {
  if (!product_id) {
    return false;
  }

  try {
    const product = await products.findByPk(product_id);

    if (!product) {
      return false;
    }

    for (const rule of ALERT_CHECKS) {
      const createAlert = rule.shouldCreate(product);
      const resolveAlert = rule.shouldResolve(product);

      if (createAlert) {
        await alerts.findOrCreate({
          where: {
            product_id,
            alert_type: rule.alert_type,
            is_resolved: false,
          },
          defaults: {
            product_id,
            alert_type: rule.alert_type,
            is_resolved: false,
            resolved_date: null,
          },
        });
      } else if (resolveAlert) {
        await alerts.update(
          {
            is_resolved: true,
            resolved_date: new Date(),
          },
          {
            where: {
              product_id,
              alert_type: rule.alert_type,
              is_resolved: false,
            },
          }
        );
      }
    }

    return true;
  } catch (error) {
    console.error('alertHelper.checkAndCreateAlert error:', error);
    return false;
  }
}

module.exports = {
  checkAndCreateAlert,
};
