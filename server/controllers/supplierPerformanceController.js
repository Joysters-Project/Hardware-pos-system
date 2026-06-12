const performanceService = require('../services/supplierPerformanceService');
const { suppliers } = require('../models');

/**
 * getPerformanceRanking
 * GET /api/procurement/performance/ranking
 */
exports.getPerformanceRanking = async (req, res) => {
  try {
    const list = await suppliers.findAll({
      attributes: [
        'supplier_id',
        'supplier_code',
        'supplier_name',
        'performance_score',
        'performance_tier',
        'on_time_delivery_pct',
        'avg_delay_days',
        'order_success_rate',
        'total_purchase_volume',
        'status'
      ],
      order: [['performance_score', 'DESC']]
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getSupplierPerformance
 * GET /api/procurement/performance/:id
 */
exports.getSupplierPerformance = async (req, res) => {
  try {
    const data = await performanceService.calculateSupplierScore(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * recalculateAll
 * POST /api/procurement/performance/recalculate
 */
exports.recalculateAll = async (req, res) => {
  try {
    const count = await performanceService.recalculateAllSuppliers();
    res.json({
      message: 'Recalculated supplier performance scores successfully',
      suppliers_updated: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
