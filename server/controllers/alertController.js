const { alerts, products } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { syncAlertsForProduct } = require('../services/alertService');

const NEAR_EXPIRY_DAYS = 7;

function getApplicableTypes(product) {
  const types = [];
  const stock   = parseInt(product.stock_quantity)     || 0;
  const minQty  = parseInt(product.min_stock_quantity) || 0;
  const reorder = parseInt(product.reorder_level)      || 0;

  if (stock === 0) {
    types.push('Out of Stock');
  } else {
    if (stock <= minQty)  types.push('Low Stock');
    if (stock <= reorder) types.push('Reorder');
  }

  if (product.expiry_date) {
    const daysLeft = Math.ceil(
      (new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft >= 0 && daysLeft <= NEAR_EXPIRY_DAYS) types.push('Near Expiry');
  }

  return types;
}

// GET /api/alerts/generate
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
          await alerts.create({
            product_id: product.product_id,
            alert_type,
            is_resolved: false
          });
          created++;
        }
      }

      const toResolve = ALL_TYPES.filter(t => !applicable.includes(t));
      for (const alert_type of toResolve) {
        const updated = await alerts.update(
          { is_resolved: true, resolved_date: new Date() },
          { where: { product_id: product.product_id, alert_type, is_resolved: false } }
        );
        autoResolved += updated[0];
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
  const t = await sequelize.transaction();
  try {
    const alert = await alerts.findByPk(req.params.id, { transaction: t });
    if (!alert) {
      await t.rollback();
      return res.status(404).json({ message: 'Alert not found' });
    }

    if (alert.is_resolved) {
      await t.rollback();
      return res.status(409).json({ message: 'Alert is already resolved. Stock was not modified.' });
    }

    // ── Inventory alert types: all trigger a restock ───────────────────────
    // Out of Stock, Low Stock, and Reorder are all derived from the same
    // stock_quantity value — resolving any one of them means receiving stock.
    const INVENTORY_TYPES = ['Out of Stock', 'Low Stock', 'Reorder'];
    const isInventoryAlert = INVENTORY_TYPES.includes(alert.alert_type);

    let stockBefore = null;
    let stockAfter  = null;
    let productName = null;
    let reorderQty  = null;

    if (isInventoryAlert) {
      const product = await products.findByPk(alert.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: 'Related product not found' });
      }

      stockBefore = parseInt(product.stock_quantity) || 0;
      reorderQty  = parseInt(product.reorder_level)  || 0;
      stockAfter  = stockBefore + reorderQty;
      productName = product.product_name;

      // 1. Update the product stock
      await product.update({ stock_quantity: stockAfter }, { transaction: t });

      // 2. Resolve ALL open inventory alerts for this product atomically
      await alerts.update(
        { is_resolved: true, resolved_date: new Date() },
        {
          where: { product_id: alert.product_id, alert_type: INVENTORY_TYPES, is_resolved: false },
          transaction: t
        }
      );

      await t.commit();

      // 3. Re-evaluate all alert conditions with fresh stock — may re-open
      //    alerts if new stock still triggers a threshold (e.g. still below min)
      await syncAlertsForProduct(await products.findByPk(alert.product_id));

    } else {
      // ── Near Expiry and any other alert type: resolve independently ────
      await alert.update(
        { is_resolved: true, resolved_date: new Date() },
        { transaction: t }
      );
      await t.commit();
    }

    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');

    const message = isInventoryAlert
      ? `Stock restocked for "${productName}". Updated from ${stockBefore} to ${stockAfter}. All related inventory alerts recalculated.`
      : 'Alert resolved successfully.';

    return res.status(200).json({
      message,
      data: alert,
      ...(isInventoryAlert && {
        restock: { productName, stockBefore, stockAfter, reorderQty }
      })
    });

  } catch (error) {
    await t.rollback();
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
