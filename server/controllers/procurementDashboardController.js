const db = require('../models');
const { purchase_orders, suppliers, supplier_payments, auto_reorder_suggestions, products, sequelize } = db;
const { fn, col, literal, Op } = require('sequelize');

// GET /api/procurement/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    const [
      totalSuppliers,
      activeSuppliers,
      pendingOrders,
      approvedOrders,
      shippedOrders,
      receivedOrders,
      overdueOrders,
      outstandingPayablesSum,
      paymentsDueThisWeekSum,
      monthlyPurchaseSum,
      reorderSuggestionsCount,
      receivedWithDeliveryDates,
      statusCounts,
      monthlyVolume,
      topSuppliers,
      supplierPerformance,
      paymentStatusCounts,
      forecastCounts
    ] = await Promise.all([
      // 1. Cards queries
      suppliers.count(),
      suppliers.count({ where: { status: 'Active' } }),
      purchase_orders.count({ where: { status: 'Pending' } }),
      purchase_orders.count({ where: { status: 'Approved' } }),
      purchase_orders.count({ where: { status: 'Shipped' } }),
      purchase_orders.count({ where: { status: 'Received' } }),
      purchase_orders.count({
        where: {
          status: { [Op.in]: ['Pending', 'Approved', 'Shipped'] },
          expected_delivery: { [Op.lt]: today },
        },
      }),
      // Outstanding Payables
      supplier_payments.sum('balance_amount', {
        where: {
          payment_status: { [Op.in]: ['Pending', 'Partially Paid', 'Overdue'] }
        }
      }),
      // Payments due this week
      supplier_payments.sum('balance_amount', {
        where: {
          payment_status: { [Op.in]: ['Pending', 'Partially Paid', 'Overdue'] },
          due_date: { [Op.between]: [today, sevenDaysLater] }
        }
      }),
      // Monthly purchase value (this month)
      purchase_orders.sum('total_amount', {
        where: {
          po_date: { [Op.gte]: currentMonthStart },
          status: { [Op.ne]: 'Cancelled' }
        }
      }),
      // Auto-reorder suggestions count
      auto_reorder_suggestions.count({ where: { status: 'Pending' } }),
      
      // Delivery time calculation data
      purchase_orders.findAll({
        attributes: ['po_date', 'actual_delivery_date'],
        where: {
          status: 'Received',
          actual_delivery_date: { [Op.ne]: null }
        },
        raw: true
      }),

      // 2. Charts queries
      // PO Status distribution
      purchase_orders.findAll({
        attributes: ['status', [fn('COUNT', col('po_id')), 'count']],
        group: ['status'],
        raw: true,
      }),

      // Monthly purchase volume (last 6 months)
      purchase_orders.findAll({
        attributes: [
          [fn('DATE_FORMAT', col('po_date'), '%Y-%m'), 'month'],
          [fn('SUM', col('total_amount')), 'total'],
          [fn('COUNT', col('po_id')), 'count'],
        ],
        where: {
          po_date: { [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 6 MONTH)') },
          status: { [Op.ne]: 'Cancelled' }
        },
        group: [fn('DATE_FORMAT', col('po_date'), '%Y-%m')],
        order: [[fn('DATE_FORMAT', col('po_date'), '%Y-%m'), 'ASC']],
        raw: true,
      }),

      // Top 5 suppliers by spend
      purchase_orders.findAll({
        attributes: [
          'supplier_id',
          [fn('SUM', col('total_amount')), 'total_spend'],
          [fn('COUNT', col('po_id')), 'po_count'],
        ],
        include: [{ model: suppliers, attributes: ['supplier_name'] }],
        where: { status: 'Received' },
        group: ['purchase_orders.supplier_id', 'supplier.supplier_id'],
        order: [[fn('SUM', col('total_amount')), 'DESC']],
        limit: 5,
      }),

      // Supplier Performance scores
      suppliers.findAll({
        attributes: ['supplier_name', 'performance_score', 'performance_tier'],
        where: { status: 'Active' },
        order: [['performance_score', 'DESC']],
        limit: 8,
        raw: true
      }),

      // Payment Status Distribution
      supplier_payments.findAll({
        attributes: ['payment_status', [fn('SUM', col('balance_amount')), 'total_balance'], [fn('COUNT', col('payment_id')), 'count']],
        group: ['payment_status'],
        raw: true
      }),

      // Forecast Severity counts (we can aggregate using product table's avg_daily_sales & stock_quantity)
      products.findAll({
        attributes: ['product_id', 'stock_quantity', 'avg_daily_sales'],
        where: { status: 'active' },
        raw: true
      })
    ]);

    // Average delivery time logic
    let totalDays = 0;
    let validDeliveryCount = 0;
    receivedWithDeliveryDates.forEach(po => {
      if (po.po_date && po.actual_delivery_date) {
        const poDate = new Date(po.po_date);
        const delDate = new Date(po.actual_delivery_date);
        const diffDays = Math.ceil((delDate.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          totalDays += diffDays;
          validDeliveryCount++;
        }
      }
    });
    const avgDeliveryTime = validDeliveryCount > 0 ? parseFloat((totalDays / validDeliveryCount).toFixed(1)) : 0;

    // Forecast Severity counts logic
    let forecastCritical = 0;
    let forecastLow = 0;
    let forecastSafe = 0;

    forecastCounts.forEach(p => {
      const stock = p.stock_quantity;
      const sales = parseFloat(p.avg_daily_sales);
      if (sales > 0) {
        const days = stock / sales;
        if (days <= 7) forecastCritical++;
        else if (days <= 14) forecastLow++;
        else forecastSafe++;
      } else {
        forecastSafe++;
      }
    });

    res.json({
      cards: {
        totalSuppliers,
        activeSuppliers,
        pendingOrders,
        approvedOrders,
        shippedOrders,
        receivedOrders,
        overdueOrders,
        outstandingPayables: parseFloat(outstandingPayablesSum) || 0,
        paymentsDueThisWeek: parseFloat(paymentsDueThisWeekSum) || 0,
        monthlyPurchaseValue: parseFloat(monthlyPurchaseSum) || 0,
        reorderSuggestionsCount,
        avgDeliveryTime
      },
      charts: {
        poStatusDistribution: statusCounts.map((r) => ({ name: r.status, value: parseInt(r.count) })),
        monthlyVolume: monthlyVolume.map((r) => ({
          month: r.month,
          total: parseFloat(r.total) || 0,
          count: parseInt(r.count),
        })),
        topSuppliers: topSuppliers.map((r) => ({
          supplier_name: r.supplier?.supplier_name || 'Unknown',
          total_spend:   parseFloat(r.getDataValue('total_spend')) || 0,
          po_count:      parseInt(r.getDataValue('po_count')),
        })),
        supplierPerformance: supplierPerformance.map((s) => ({
          name: s.supplier_name,
          score: parseFloat(s.performance_score) || 0,
          tier: s.performance_tier
        })),
        paymentStatusDistribution: paymentStatusCounts.map((p) => ({
          status: p.payment_status,
          value: parseFloat(p.total_balance) || 0,
          count: parseInt(p.count)
        })),
        forecastDistribution: [
          { name: 'Critical (<7 days)', value: forecastCritical },
          { name: 'Low (<14 days)', value: forecastLow },
          { name: 'Safe (≥14 days)', value: forecastSafe }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
