const { alerts, products } = require('../models');
const { Op } = require('sequelize');

exports.createAlert = async (req, res) => {
  try {
    const alert = await alerts.create(req.body);
    res.status(201).json({ message: 'Alert created successfully', data: alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllAlerts = async (req, res) => {
  try {
    const alertList = await alerts.findAll({
      include: [{ model: products, attributes: ['product_name', 'stock_quantity', 'expiry_date', 'min_stock_quantity'] }],
      order: [['alert_id', 'DESC']],
    });
    res.status(200).json(alertList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id, {
      include: [{ model: products, attributes: ['product_name', 'stock_quantity', 'expiry_date'] }],
    });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.status(200).json(alert);
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

// RESOLVE Alert
exports.resolveAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await alert.update({ is_resolved: true });
    res.status(200).json({ message: 'Alert resolved successfully', data: alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/expiry-alerts  — products expiring within N days (default 30)
exports.getExpiryAlerts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const today = new Date();
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const expiring = await products.findAll({
      where: {
        expiry_date: { [Op.between]: [today, future] },
        status: 'active',
      },
      attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
      order: [['expiry_date', 'ASC']],
    });

    const expired = await products.findAll({
      where: {
        expiry_date: { [Op.lt]: today },
        status: 'active',
      },
      attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
      order: [['expiry_date', 'ASC']],
    });

    res.json({ expiring, expired });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
