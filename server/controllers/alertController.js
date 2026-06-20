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
    const alert = await alerts.create(req.body);
    res.status(201).json({ message: 'Alert created successfully', data: alert });
  } catch (error) {
    console.error('generateAlerts error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const { limit, unresolved, search, alert_type } = req.query;
    const queryOptions = {
      where: {},
      include: [{
        model: products,
        attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'batch_no', 'expiry_date', 'status'],
      }],
      order: [['is_resolved', 'ASC'], ['alert_id', 'DESC']],
    };

    if (unresolved === 'true') queryOptions.where.is_resolved = false;
    if (alert_type) queryOptions.where.alert_type = alert_type;
    if (search) {
      queryOptions.where[Op.or] = [
        { alert_type: { [Op.like]: `%${search}%` } },
        { '$product.product_name$': { [Op.like]: `%${search}%` } },
      ];
      queryOptions.subQuery = false;
    }
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!Number.isNaN(parsed) && parsed > 0) queryOptions.limit = parsed;
    }

    const alertList = await alerts.findAll(queryOptions);
    res.status(200).json(alertList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id, {
      include: [{
        model: products,
        attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity', 'reorder_level', 'batch_no', 'expiry_date', 'status'],
      }],
    });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.status(200).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAlertCount = async (req, res) => {
  try {
    const count = await alerts.count({ where: { is_resolved: false } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await alert.update({ is_resolved: true, resolved_date: new Date() });
    res.status(200).json({ message: 'Alert resolved successfully', data: alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

exports.getExpiryAlerts = async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 30;
    const today  = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const [expiring, expired] = await Promise.all([
      products.findAll({
        where: { expiry_date: { [Op.between]: [today, future] }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
      products.findAll({
        where: { expiry_date: { [Op.lt]: today }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
    ]);

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
