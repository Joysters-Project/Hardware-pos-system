const { alerts, products } = require('../models');
const { Op } = require('sequelize');

const NEAR_EXPIRY_DAYS = 7;

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

// POST /api/alerts/generate
exports.generateAlerts = async (req, res) => {
  try {
    const allProducts = await products.findAll({
      attributes: [
        'product_id', 'product_name', 'stock_quantity',
        'min_stock_quantity', 'reorder_level', 'expiry_date'
      ]
    });

    let created = 0;
    let autoResolved = 0;
    const ALL_TYPES = ['Out of Stock', 'Low Stock', 'Reorder', 'Near Expiry'];

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

    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');

    res.status(200).json({
      message: 'Alert generation complete',
      productsScanned: allProducts.length,
      alertsCreated: created,
      alertsAutoResolved: autoResolved
    });
  } catch (error) {
    console.error('generateAlerts error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const { unresolved, alert_type } = req.query;
    const where = {};
    if (unresolved === 'true') where.is_resolved = false;
    if (alert_type) where.alert_type = alert_type;

    const alertList = await alerts.findAll({
      where,
      include: [{
        model: products,
        attributes: ['product_name', 'batch_no', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'status']
      }],
      order: [['alert_id', 'DESC']]
    });

    res.status(200).json(alertList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/expiry-alerts
exports.getExpiryAlerts = async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 30;
    const today  = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const expiring = await products.findAll({
      where: { expiry_date: { [Op.between]: [today, future] }, status: 'active' },
      attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
      order: [['expiry_date', 'ASC']],
    });

    const expired = await products.findAll({
      where: { expiry_date: { [Op.lt]: today }, status: 'active' },
      attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
      order: [['expiry_date', 'ASC']],
    });

    res.json({ expiring, expired });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/:id
exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id, {
      include: [{ model: products, attributes: ['product_name', 'stock_quantity', 'min_stock_quantity', 'status'] }]
    });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.status(200).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/alerts/:id/resolve
exports.resolveAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    if (alert.is_resolved)
      return res.status(409).json({ message: 'Alert is already resolved.' });

    // Mark resolved only — do NOT touch stock quantity
    await alert.update({ is_resolved: true, resolved_date: new Date() });

    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');

    return res.status(200).json({ message: 'Alert resolved successfully.', data: alert });
  } catch (error) {
    console.error('resolveAlert error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/alerts
exports.createAlert = async (req, res) => {
  try {
    const alert = await alerts.create(req.body);
    res.status(201).json({ message: 'Alert created successfully', data: alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/alerts/:id
exports.updateAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await alert.update(req.body);
    res.status(200).json({ message: 'Alert updated successfully', data: alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/alerts/:id
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await alert.destroy();
    res.status(200).json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
