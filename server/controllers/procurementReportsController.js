const { purchase_orders, suppliers, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// GET /api/procurement/reports/supplier-performance
exports.supplierPerformance = async (req, res) => {
  try {
    const rows = await purchase_orders.findAll({
      attributes: [
        'supplier_id',
        [fn('COUNT', col('purchase_orders.po_id')), 'total_orders'],
        [fn('SUM', literal("CASE WHEN status = 'Received' THEN 1 ELSE 0 END")), 'received_count'],
        [fn('SUM', literal(
          "CASE WHEN status = 'Received' AND actual_delivery_date <= expected_delivery THEN 1 ELSE 0 END"
        )), 'on_time_count'],
        [fn('AVG', literal(
          "CASE WHEN status = 'Received' AND actual_delivery_date > expected_delivery " +
          "THEN DATEDIFF(actual_delivery_date, expected_delivery) ELSE NULL END"
        )), 'avg_delay_days'],
      ],
      include: [{ model: suppliers, attributes: ['supplier_name', 'supplier_code', 'performance_rating'] }],
      group: ['purchase_orders.supplier_id', 'supplier.supplier_id'],
      raw: false,
    });

    const result = rows.map((r) => {
      const total     = parseInt(r.getDataValue('total_orders'))   || 0;
      const received  = parseInt(r.getDataValue('received_count')) || 0;
      const onTime    = parseInt(r.getDataValue('on_time_count'))  || 0;
      const avgDelay  = parseFloat(r.getDataValue('avg_delay_days')) || 0;

      return {
        supplier_id:        r.supplier_id,
        supplier_name:      r.supplier?.supplier_name || '-',
        supplier_code:      r.supplier?.supplier_code || '-',
        performance_rating: r.supplier?.performance_rating || null,
        total_orders:       total,
        received_orders:    received,
        on_time_pct:        received > 0 ? Math.round((onTime / received) * 100) : 0,
        avg_delay_days:     Math.round(avgDelay * 10) / 10,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/reports/purchases
exports.purchaseSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.po_date = {};
      if (from) where.po_date[Op.gte] = from;
      if (to)   where.po_date[Op.lte] = to;
    }

    const rows = await purchase_orders.findAll({
      attributes: [
        'supplier_id',
        [fn('COUNT', col('purchase_orders.po_id')), 'total_orders'],
        [fn('SUM', col('total_amount')), 'total_value'],
        [fn('SUM', literal("CASE WHEN status = 'Received' THEN total_amount ELSE 0 END")), 'received_value'],
      ],
      include: [{ model: suppliers, attributes: ['supplier_name', 'supplier_code'] }],
      where,
      group: ['purchase_orders.supplier_id', 'supplier.supplier_id'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
    });

    const result = rows.map((r) => ({
      supplier_id:    r.supplier_id,
      supplier_name:  r.supplier?.supplier_name || '-',
      supplier_code:  r.supplier?.supplier_code || '-',
      total_orders:   parseInt(r.getDataValue('total_orders'))  || 0,
      total_value:    parseFloat(r.getDataValue('total_value')) || 0,
      received_value: parseFloat(r.getDataValue('received_value')) || 0,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/reports/outstanding
exports.outstandingOrders = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const orders = await purchase_orders.findAll({
      where: {
        status: { [Op.in]: ['Pending', 'Approved', 'Shipped'] },
        expected_delivery: { [Op.lt]: today },
      },
      include: [{ model: suppliers, attributes: ['supplier_name', 'phone'] }],
      order: [['expected_delivery', 'ASC']],
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
