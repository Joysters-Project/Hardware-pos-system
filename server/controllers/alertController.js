const { alerts, products, batch_inventory } = require('../models');
const db = require('../models');
const { Op } = require('sequelize');
const { EXPIRED_BATCH_ALERT, syncAlertsForProduct, generateAllAlerts } = require('../services/alertService');

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

// GET /api/alerts/summary — counts for all 5 alert types + Active/Purchase Ordered statuses
exports.getAlertSummary = async (req, res) => {
  try {
    const baseInclude = [{ model: products, attributes: ['stock_quantity', 'min_stock_quantity', 'reorder_level'] }];

    const [outOfStockRows, lowStockRows, reorder, nearExpiry, expired, activeCount, poOrderedCount] = await Promise.all([
      alerts.findAll({ where: { alert_type: 'Out of Stock', is_resolved: false }, include: baseInclude }),
      alerts.findAll({ where: { alert_type: 'Low Stock',    is_resolved: false }, include: baseInclude }),
      alerts.count({ where: { alert_type: 'Reorder',      is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Near Expiry',  is_resolved: false } }),
      alerts.count({ where: { alert_type: 'Expired', is_resolved: false } }),
      alerts.count({ where: { status: 'Active' } }),
      alerts.count({ where: { status: 'Purchase Ordered', is_resolved: false }, distinct: true, col: 'product_id' }),
    ]);

    // Only count Out of Stock alerts where product stock is actually 0
    const outOfStock = outOfStockRows.filter(a => a.product && parseInt(a.product.stock_quantity) === 0).length;
    // Only count Low Stock alerts where product stock > 0 AND stock <= min_stock_quantity
    const lowStock = lowStockRows.filter(a => {
      if (!a.product) return false;
      const stock = parseInt(a.product.stock_quantity);
      const min   = parseInt(a.product.min_stock_quantity);
      return stock > 0 && stock <= min;
    }).length;

    res.json({
      'Out of Stock': outOfStock,
      'Low Stock':    lowStock,
      'Reorder':      reorder,
      'Near Expiry':  nearExpiry,
      'Expired':      expired,
      total: outOfStock + lowStock + reorder + nearExpiry + expired,
      'Active': activeCount,
      'Purchase Ordered': poOrderedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts
exports.getAllAlerts = async (req, res) => {
  try {
    const { limit, search, alert_type, status } = req.query;
    const where = { is_resolved: false };
    if (status) where.status = status;
    if (alert_type) where.alert_type = alert_type === EXPIRED_BATCH_ALERT ? 'Expired' : alert_type;

    if (search) {
      where[Op.or] = [
        db.Sequelize.where(
          db.Sequelize.fn('LOWER', db.Sequelize.col('alert_type')),
          { like: `%${search.toLowerCase()}%` }
        ),
        db.Sequelize.where(
          db.Sequelize.fn('LOWER', db.Sequelize.col('product.product_name')),
          { like: `%${search.toLowerCase()}%` }
        ),
      ];
    }

    const opts = {
      where,
      include: [{
        model: products,
        attributes: ['product_id', 'product_name', 'stock_quantity', 'min_stock_quantity',
                     'reorder_level', 'batch_no', 'expiry_date', 'status'],
      }],
      order: [['alert_id', 'DESC']],
      ...(search ? { subQuery: false } : {}),
      ...(limit && !isNaN(parseInt(limit)) ? { limit: parseInt(limit) } : {}),
    };

    const alertsList = await alerts.findAll(opts);

    // Filter out stale stock alerts that no longer match actual product stock
    let response = alertsList.filter(alert => {
      const product = alert.product;
      if (!product) return true;
      const stock = parseInt(product.stock_quantity);
      const min   = parseInt(product.min_stock_quantity);
      if (alert.alert_type === 'Out of Stock') return stock === 0;
      if (alert.alert_type === 'Low Stock')    return stock > 0 && stock <= min;
      return true;
    });

    if (where.status === 'Purchase Ordered' && !alert_type) {
      const seen = new Set();
      response = [];
      for (const alert of alertsList) {
        const pid = alert.product_id;
        if (!seen.has(pid)) {
          seen.add(pid);
          response.push(alert);
        }
      }
    }

    // Build FIFO batch map: batch_inventory (Active, remaining_qty > 0) takes priority,
    // fallback to product.batch_no if no inventory record exists.
    const productIds = [...new Set(response.map(a => a.product_id).filter(Boolean))];
    const batchIds = [...new Set(response.map(a => a.batch_id).filter(Boolean))];
    const batchMap = {};
    const alertBatchMap = {};
    if (batch_inventory && batchIds.length) {
      const batches = await batch_inventory.findAll({
        where: { batch_id: { [Op.in]: batchIds } },
        attributes: ['batch_id', 'batch_number', 'expiry_date', 'remaining_quantity'],
      });
      for (const batch of batches) alertBatchMap[batch.batch_id] = batch;
    }
    if (batch_inventory && productIds.length) {
      const batches = await batch_inventory.findAll({
        where: { product_id: productIds, remaining_quantity: { [Op.gt]: 0 }, status: 'Active' },
        attributes: ['product_id', 'batch_number', 'expiry_date'],
        order: [['expiry_date', 'ASC']],
      });
      for (const b of batches) {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = b.batch_number;
      }
    }

    const mapped = response.map(alert => {
      const plain = alert.toJSON();
      plain.batch = alertBatchMap[plain.batch_id] || null;
      plain.batch_number = plain.batch?.batch_number || batchMap[plain.product_id] || plain.product?.batch_no || null;
      plain.expiry_date = plain.batch?.expiry_date || plain.product?.expiry_date || null;
      plain.alert_label = plain.batch_id && plain.alert_type === 'Expired'
        ? 'Expired Stock – Disposal Required'
        : plain.alert_type;
      return plain;
    });

    res.status(200).json(mapped);
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
        where: { expiry_date: { [Op.between]: [today, future] }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
      products.findAll({
        where: { expiry_date: { [Op.lte]: today }, status: 'active' },
        attributes: ['product_id', 'product_name', 'expiry_date', 'stock_quantity', 'batch_no'],
        order: [['expiry_date', 'ASC']],
      }),
    ]);
    res.json({ expiring, expired });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/alerts/customer-due-alerts
exports.getCustomerDueAlerts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await db.bills.findAll({
      where: {
        status: 'PARTIAL',
        balance_due: { [Op.gt]: 0 },
        expected_payment_date: { [Op.ne]: null }
      },
      include: [
        {
          model: db.customers,
          attributes: ['customer_id', 'customer_name', 'phone_no', 'address']
        }
      ],
      order: [['expected_payment_date', 'ASC']]
    });

    const DUE_SOON_DAYS = 3;
    const alertsList = [];

    function parseLocalDate(dateStr) {
      if (!dateStr) return null;
      const parts = String(dateStr).split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(dateStr);
    }

    for (const bill of rows) {
      if (!bill.expected_payment_date) continue;

      const expDate = parseLocalDate(bill.expected_payment_date);
      if (!expDate || isNaN(expDate.getTime())) continue;

      const diffMs = expDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let alert_type;
      if (diffDays < 0) {
        alert_type = 'Overdue';
      } else if (diffDays === 0) {
        alert_type = 'Due Today';
      } else if (diffDays <= DUE_SOON_DAYS) {
        alert_type = 'Due Soon';
      } else {
        // Not yet within alertable window
        continue;
      }

      const customerObj = bill.customer || bill.Customer;

      alertsList.push({
        bill_id: bill.bill_id,
        invoice_number: bill.bill_no,
        customer_id: bill.customer_id,
        customer_name: customerObj?.customer_name || 'Walk-in Customer',
        phone_no: customerObj?.phone_no || '—',
        address: customerObj?.address || '—',
        expected_payment_date: bill.expected_payment_date,
        due_amount: parseFloat(bill.balance_due || 0),
        total_amount: parseFloat(bill.total_amount || 0),
        bill_status: bill.status,
        alert_type,
        days_remaining: diffDays
      });
    }

    const summary = {
      dueSoon:  alertsList.filter(a => a.alert_type === 'Due Soon').length,
      dueToday: alertsList.filter(a => a.alert_type === 'Due Today').length,
      overdue:  alertsList.filter(a => a.alert_type === 'Overdue').length,
      total:    alertsList.length
    };

    res.json({ alerts: alertsList, summary });
  } catch (error) {
    console.error('getCustomerDueAlerts error:', error);
    res.status(500).json({ error: error.message });
  }
};