const { Op } = require('sequelize');
const { alerts, products } = require('../models');

// CREATE Alert
exports.createAlert = async (req, res) => {
  try {
    const alert = await alerts.create(req.body);
    res.status(201).json({
      message: 'Alert created successfully',
      data: alert,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const { limit, unresolved, search, alert_type } = req.query;
    const queryOptions = {
      where: {},
      include: [
        {
          model: products,
          attributes: [
            'product_id',
            'product_name',
            'stock_quantity',
            'min_stock_quantity',
            'reorder_level',
            'batch_no',
            'expiry_date',
            'status',
          ],
        },
      ],
      order: [
        ['is_resolved', 'ASC'],
        ['alert_id', 'DESC'],
      ],
    };

    if (unresolved === 'true') {
      queryOptions.where.is_resolved = false;
    }

    if (alert_type) {
      queryOptions.where.alert_type = alert_type;
    }

    if (search) {
      queryOptions.where[Op.or] = [
        { alert_type: { [Op.like]: `%${search}%` } },
        { '$product.product_name$': { [Op.like]: `%${search}%` } },
        { '$product.batch_no$': { [Op.like]: `%${search}%` } },
      ];
      queryOptions.subQuery = false;
    }

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        queryOptions.limit = parsedLimit;
      }
    }

    const alertList = await alerts.findAll(queryOptions);
    res.status(200).json(alertList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET unresolved alert count
exports.getAlertCount = async (req, res) => {
  try {
    const count = await alerts.count({ where: { is_resolved: false } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// RESOLVE Alert
exports.resolveAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.update({ is_resolved: true, resolved_date: new Date() });

    res.status(200).json({
      message: 'Alert resolved successfully',
      data: alert,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id, {
      include: [
        {
          model: products,
          attributes: [
            'product_id',
            'product_name',
            'stock_quantity',
            'min_stock_quantity',
            'reorder_level',
            'batch_no',
            'expiry_date',
            'status',
          ],
        },
      ],
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.status(200).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Alert
exports.updateAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.update(req.body);

    res.status(200).json({
      message: 'Alert updated successfully',
      data: alert,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Alert
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await alerts.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.destroy();

    res.status(200).json({
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};