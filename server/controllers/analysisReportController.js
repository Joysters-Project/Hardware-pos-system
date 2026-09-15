const db = require('../models');
const { Op } = require('sequelize');

exports.getMonthlyAnalysis = async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = parseInt(year) || now.getFullYear();
    const targetMonth = parseInt(month) !== undefined ? parseInt(month) : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Previous month for comparison
    const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);
    const prevMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Current month bills
    const bills = await db.bills.findAll({
      where: { bill_date: { [Op.between]: [startOfMonth, endOfMonth] } },
      include: [{ model: db.bill_items, include: [{ model: db.products, attributes: ['product_name', 'category_id'] }] }],
    });

    // Previous month bills
    const prevBills = await db.bills.findAll({
      where: { bill_date: { [Op.between]: [prevMonthStart, prevMonthEnd] } },
    });

    const totalRevenue = bills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const prevRevenue = prevBills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const totalBills = bills.length;

    // Product sales aggregation
    const productMap = {};
    bills.forEach(bill => {
      (bill.bill_items || []).forEach(item => {
        const name = item.product?.product_name || `Product #${item.product_id}`;
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
        productMap[name].qty += parseFloat(item.quantity || 0);
        productMap[name].revenue += parseFloat(item.total_price || 0);
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily revenue breakdown
    const daysInMonth = endOfMonth.getDate();
    const dailyRevenue = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, revenue: 0, bills: 0 }));
    bills.forEach(bill => {
      const day = new Date(bill.bill_date).getDate() - 1;
      if (dailyRevenue[day]) {
        dailyRevenue[day].revenue += parseFloat(bill.total_amount || 0);
        dailyRevenue[day].bills += 1;
      }
    });

    // Projects this month
    const projects = await db.projects.findAll({
      where: { created_at: { [Op.between]: [startOfMonth, endOfMonth] } },
      attributes: ['project_id', 'project_name', 'status', 'total_amount', 'created_at'],
    }).catch(() => []);

    // Next month prediction: use last 3 months avg
    const last3Start = new Date(targetYear, targetMonth - 3, 1);
    const last3Bills = await db.bills.findAll({
      where: { bill_date: { [Op.between]: [last3Start, endOfMonth] } },
      include: [{ model: db.bill_items, include: [{ model: db.products, attributes: ['product_name'] }] }],
    });

    // Product demand over last 3 months
    const demandMap = {};
    last3Bills.forEach(bill => {
      (bill.bill_items || []).forEach(item => {
        const name = item.product?.product_name || `Product #${item.product_id}`;
        if (!demandMap[name]) demandMap[name] = { name, totalQty: 0, months: new Set() };
        demandMap[name].totalQty += parseFloat(item.quantity || 0);
        demandMap[name].months.add(`${new Date(bill.bill_date).getFullYear()}-${new Date(bill.bill_date).getMonth()}`);
      });
    });

    const predictions = Object.values(demandMap)
      .map(p => ({
        name: p.name,
        avgMonthlyQty: parseFloat((p.totalQty / 3).toFixed(2)),
        predictedNextMonth: parseFloat((p.totalQty / 3 * 1.1).toFixed(2)),
        trend: p.totalQty / 3 > 5 ? 'high' : p.totalQty / 3 > 2 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.predictedNextMonth - a.predictedNextMonth)
      .slice(0, 10);

    const revenueGrowth = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null;

    res.json({
      period: { year: targetYear, month: targetMonth, monthName: startOfMonth.toLocaleString('en-US', { month: 'long' }) },
      summary: { totalRevenue, totalBills, prevRevenue, revenueGrowth },
      topProducts,
      dailyRevenue,
      projects: projects.map(p => ({ id: p.project_id, name: p.project_name, status: p.status, amount: parseFloat(p.total_amount || 0) })),
      nextMonthPredictions: predictions,
    });
  } catch (err) {
    console.error('Monthly analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly analysis' });
  }
};

exports.getYearlyAnalysis = async (req, res) => {
  try {
    const { year } = req.query;
    const now = new Date();
    const targetYear = parseInt(year) || now.getFullYear();
    const prevYear = targetYear - 1;

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    const startOfPrevYear = new Date(prevYear, 0, 1);
    const endOfPrevYear = new Date(prevYear, 11, 31, 23, 59, 59, 999);

    // Current year bills
    const bills = await db.bills.findAll({
      where: { bill_date: { [Op.between]: [startOfYear, endOfYear] } },
      include: [{ model: db.bill_items, include: [{ model: db.products, attributes: ['product_name', 'category_id'] }] }],
    });

    // Previous year bills
    const prevBills = await db.bills.findAll({
      where: { bill_date: { [Op.between]: [startOfPrevYear, endOfPrevYear] } },
      include: [{ model: db.bill_items, include: [{ model: db.products, attributes: ['product_name'] }] }],
    });

    const totalRevenue = bills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const prevRevenue = prevBills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null;

    // Monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(targetYear, i, 1).toLocaleString('en-US', { month: 'short' }),
      revenue: 0, bills: 0,
    }));
    bills.forEach(bill => {
      const m = new Date(bill.bill_date).getMonth();
      monthlyData[m].revenue += parseFloat(bill.total_amount || 0);
      monthlyData[m].bills += 1;
    });

    // Previous year monthly
    const prevMonthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(prevYear, i, 1).toLocaleString('en-US', { month: 'short' }),
      revenue: 0,
    }));
    prevBills.forEach(bill => {
      const m = new Date(bill.bill_date).getMonth();
      prevMonthlyData[m].revenue += parseFloat(bill.total_amount || 0);
    });

    // Top products this year
    const productMap = {};
    bills.forEach(bill => {
      (bill.bill_items || []).forEach(item => {
        const name = item.product?.product_name || `Product #${item.product_id}`;
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
        productMap[name].qty += parseFloat(item.quantity || 0);
        productMap[name].revenue += parseFloat(item.total_price || 0);
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Projects this year
    const projects = await db.projects.findAll({
      where: { created_at: { [Op.between]: [startOfYear, endOfYear] } },
      attributes: ['project_id', 'project_name', 'status', 'total_amount'],
    }).catch(() => []);

    // Expenses this year
    const expenses = await db.expenses.findAll({
      where: { expense_date: { [Op.between]: [startOfYear, endOfYear] } },
      attributes: ['amount'],
    }).catch(() => []);
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    // Next year prediction: linear trend from monthly data
    const avgMonthly = totalRevenue / 12;
    const growthRate = prevRevenue > 0 ? (totalRevenue - prevRevenue) / prevRevenue : 0.1;
    const predictedNextYear = totalRevenue * (1 + Math.max(0, Math.min(growthRate, 0.5)));

    // Seasonal product forecast: rank products independently for each month.
    // Current-year quantities are preferred, with the previous year as a fallback
    // for months that have no current-year sales.
    const nextYearGrowthFactor = 1 + Math.max(0, Math.min(growthRate, 0.5));
    const buildMonthlyProductDemand = (sourceBills) => {
      const monthlyDemand = Array.from({ length: 12 }, () => ({}));
      sourceBills.forEach(bill => {
        const month = new Date(bill.bill_date).getMonth();
        (bill.bill_items || []).forEach(item => {
          const name = item.product?.product_name || `Product #${item.product_id}`;
          monthlyDemand[month][name] = (monthlyDemand[month][name] || 0) + parseFloat(item.quantity || 0);
        });
      });
      return monthlyDemand;
    };

    const currentMonthlyDemand = buildMonthlyProductDemand(bills);
    const previousMonthlyDemand = buildMonthlyProductDemand(prevBills);
    const nextYearMonthlyTopProducts = currentMonthlyDemand.map((demand, month) => {
      const source = Object.keys(demand).length > 0 ? demand : previousMonthlyDemand[month];
      return {
        month: new Date(targetYear + 1, month, 1).toLocaleString('en-US', { month: 'long' }),
        products: Object.entries(source)
          .map(([name, quantity]) => ({
            name,
            predictedQty: parseFloat((quantity * nextYearGrowthFactor).toFixed(2)),
          }))
          .sort((a, b) => b.predictedQty - a.predictedQty)
          .slice(0, 3),
      };
    });

    // Improvement suggestions based on data
    const improvements = [];
    const lowMonths = monthlyData.filter(m => m.revenue < avgMonthly * 0.7);
    if (lowMonths.length > 0) improvements.push({ type: 'warning', text: `${lowMonths.map(m => m.month).join(', ')} had below-average revenue. Consider promotions during these months.` });
    if (totalExpenses > totalRevenue * 0.4) improvements.push({ type: 'danger', text: 'Expenses exceed 40% of revenue. Review cost structure to improve margins.' });
    if (revenueGrowth !== null && parseFloat(revenueGrowth) < 0) improvements.push({ type: 'danger', text: `Revenue declined ${Math.abs(revenueGrowth)}% vs last year. Focus on customer retention and new product lines.` });
    if (revenueGrowth !== null && parseFloat(revenueGrowth) > 0) improvements.push({ type: 'success', text: `Revenue grew ${revenueGrowth}% vs last year. Maintain momentum by expanding top-selling product inventory.` });
    if (topProducts.length > 0) improvements.push({ type: 'info', text: `"${topProducts[0].name}" is your best seller. Ensure adequate stock levels heading into next year.` });

    res.json({
      period: { year: targetYear, prevYear },
      summary: { totalRevenue, totalBills: bills.length, prevRevenue, revenueGrowth, totalExpenses, netProfit: totalRevenue - totalExpenses },
      monthlyData,
      prevMonthlyData,
      topProducts,
      projects: projects.map(p => ({ id: p.project_id, name: p.project_name, status: p.status, amount: parseFloat(p.total_amount || 0) })),
      prediction: { nextYearRevenue: parseFloat(predictedNextYear.toFixed(2)), growthRate: parseFloat((growthRate * 100).toFixed(1)) },
      nextYearMonthlyTopProducts,
      improvements,
    });
  } catch (err) {
    console.error('Yearly analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch yearly analysis' });
  }
};
