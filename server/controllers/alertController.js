const { alerts, products } = require('../models');
const { syncAlertsForProduct, generateAllAlerts } = require('../services/alertService');

const NEAR_EXPIRY_DAYS = 30; // dashboard uses 30-day window

// POST /api/alerts/generate — full inventory scan
exports.generateAlerts = async (req, res) => {
  try {
    const result = await generateAllAlerts();
    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');
    res.status(200).json({ message: 'Alert generation complete', ...result });
  } catch (error) {
    console.error('generateAlerts error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/summary — counts for all 5 alert types (used by dashboard + bell)
exports.getAlertSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [outOfStock, lowStock, reorder, nearExpiry, expired] = await Promise.all([
      alerts.count({ where: { alert_type: 'Out of Stock',  is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Low Stock',     is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Reorder',       is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Near Expiry',   is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Expired',       is_resolved: false } }),
    ]);

    res.json({
      'Out of Stock': outOfStock,
      'Low Stock':    lowStock,
      'Reorder':      reorder,
      'Near Expiry':  nearExpiry,
      'Expired':      expired,
      total: outOfStock + lowStock + reorder + nearExpiry + expired,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const { limit, unresolved, search, alert_type } = req.query;
    const where = {};
    if (unresolved === 'true') where.is_resolved = false;
    if (alert_type) where.alert_type = alert_type;
    if (search) {
      where.$or = [
        { alert_type: { $like: `%${search}%` } },
        { '$product.product_name$': { $like: `%${search}%` } },
      ];
    }

    const opts = {
      where,
      include: [{
        model: products,
        attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity',
                     'reorder_level', 'batch_no', 'expiry_date', 'status'],
      }],
      order: [['is_resolved', 'ASC'], ['alert_id', 'DESC']],
      ...(search ? { subQuery: false } : {}),
      ...(limit && !isNaN(parseInt(limit)) ? { limit: parseInt(limit) } : {}),
    };

    res.status(200).json(await alerts.findAll(opts));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/:id
exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id, {
      include: [{ model: products,
        attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity',
                     'reorder_level', 'batch_no', 'expiry_date', 'status'] }],
    });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.status(200).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/count
exports.getAlertCount = async (req, res) => {
  try {
    const count = await alerts.count({ where: { is_resolved: false } });
    res.status(200).json({ count });
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

    await alert.update({ is_resolved: true, resolved_date: new Date() });
    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');
    return res.status(200).json({ message: 'Alert resolved successfully.', data: alert });
  } catch (error) {
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

// GET /api/alerts/expiry-alerts
exports.getExpiryAlerts = async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 30;
    const today = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const [expiring, expired] = await Promise.all([
      products.findAll({
        where: { expiry_date: { $between: [today, future] }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
      products.findAll({
        where: { expiry_date: { $lt: today }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
    ]);
    res.json({ expiring, expired });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
