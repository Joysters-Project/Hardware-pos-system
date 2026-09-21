const db = require('../models');
const { Op } = require('sequelize');
const round = n => Number(n.toFixed(2));
const amount = n => Number(n || 0);
const sum = rows => round(rows.reduce((s, b) => s + amount(b.total_amount), 0));
// Match the database's business timezone regardless of the server's timezone.
const offset = 330 * 60000;
const local = value => typeof value === 'string' && !/(Z|[+-]\d\d:\d\d)$/.test(value)
  ? new Date(`${(value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))}+05:30`) : new Date(value);
const parts = value => new Date(local(value).getTime() + offset);
const boundary = (y, m, d = 1) => new Date(Date.UTC(y, m, d) - offset);
const range = (start, end) => ({ [Op.gte]: start, [Op.lt]: end });
const monthName = (m, long = false) => new Date(Date.UTC(2000, m, 1)).toLocaleString('en-US', { month: long ? 'long' : 'short', timeZone: 'UTC' });
const include = [{ model: db.bill_items, include: [{ model: db.products, attributes: ['product_name'] }] }];
const fetchBills = (start, end) => db.bills.findAll({ where: { bill_date: range(start, end), status: { [Op.in]: ['PAID', 'PARTIAL', 'UNPAID'] } }, include });
const growth = (current, previous) => previous > 0 ? Number(((current - previous) / previous * 100).toFixed(1)) : null;
const confidenceLevel = (activeMonths, billCount) => activeMonths === 3 && billCount >= 20 ? 'high' : activeMonths >= 2 && billCount >= 5 ? 'medium' : 'low';
function period(query) {
  const now = parts(new Date());
  const year = query.year === undefined ? now.getUTCFullYear() : Number(query.year);
  const month = query.month === undefined ? now.getUTCMonth() : Number(query.month);
  if (!Number.isInteger(year) || year < 1900 || year > 9998 || !Number.isInteger(month) || month < 0 || month > 11 || query.year === '' || query.month === '') return null;
  return { year, month, now };
}
function allocatedItems(bill) {
  const items = bill.bill_items || [];
  const lineTotal = items.reduce((s, i) => s + amount(i.total_price), 0);
  let allocated = 0;
  let cumulative = 0;
  return items.map(item => {
    cumulative += amount(item.total_price);
    const next = lineTotal > 0 ? Math.round(amount(bill.total_amount) * 100 * cumulative / lineTotal) : 0;
    const allocatedRevenue = (next - allocated) / 100;
    allocated = next;
    return {
      productId: item.product_id,
      name: item.product?.product_name || `Product #${item.product_id}`,
      qty: amount(item.quantity),
      allocatedRevenue,
    };
  });
}
function products(bills) {
  const map = new Map();
  bills.forEach(bill => {
    allocatedItems(bill).forEach(item => {
      const id = item.productId;
      if (!map.has(id)) map.set(id, { productId: id, name: item.name, qty: 0, revenue: 0 });
      const row = map.get(id);
      row.qty += item.qty; // Stored in the product's base unit.
      row.revenue += item.allocatedRevenue;
    });
  });
  return [...map.values()].map(p => ({ ...p, qty: round(p.qty), revenue: round(p.revenue) })).sort((a, b) => b.revenue - a.revenue);
}
const notes = [
  'Calculation update: sales use saved bill totals after discounts, including unpaid balances. Returns already change the original bill; refunds are not deducted twice. Historical reports therefore reflect current bill records, not a frozen accounting ledger.',
  'Product revenue allocates each bill total proportionally to its line totals. Products are grouped by ID; quantities use each product’s base unit. Any bill amount without positive item totals cannot be attributed to a product.',
];
exports.getMonthlyAnalysis = async (req, res) => {
  const p = period(req.query);
  if (!p) return res.status(400).json({ error: 'Use an integer year and a month from 0 to 11.' });
  try {
    const { year, month, now } = p;
    const start = boundary(year, month), end = boundary(year, month + 1);
    const incomplete = end > new Date();
    const bills = await fetchBills(start, end);
    const prevBills = await fetchBills(boundary(year, month - 1), start);
    const totalRevenue = sum(bills), prevRevenue = sum(prevBills);
    const dailyRevenue = Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, i) => ({ day: i + 1, revenue: 0, bills: 0 }));
    bills.forEach(b => { const row = dailyRevenue[parts(b.bill_date).getUTCDate() - 1]; row.revenue += amount(b.total_amount); row.bills++; });
    dailyRevenue.forEach(row => { row.revenue = round(row.revenue); });
    // Exactly three completed calendar months, including selected month if closed.
    const forecastEnd = new Date(Math.min(end.getTime(), boundary(now.getUTCFullYear(), now.getUTCMonth()).getTime()));
    const fp = parts(forecastEnd);
    const forecastStart = boundary(fp.getUTCFullYear(), fp.getUTCMonth() - 3);
    const history = await fetchBills(forecastStart, forecastEnd);
    const historyMonthKeys = new Set(history.map(b => `${parts(b.bill_date).getUTCFullYear()}-${parts(b.bill_date).getUTCMonth()}`));
    const nextMonthPredictions = products(history).map(p => {
      const productBills = history.filter(b => (b.bill_items || []).some(item => Number(item.product_id) === Number(p.productId)));
      const activeMonths = new Set(productBills.map(b => `${parts(b.bill_date).getUTCFullYear()}-${parts(b.bill_date).getUTCMonth()}`)).size;
      return {
        ...p,
        avgMonthlyQty: round(p.qty / 3),
        predictedNextMonth: round(p.qty / 3),
        trend: p.qty / 3 > 5 ? 'high' : p.qty / 3 > 2 ? 'medium' : 'low',
        confidence: { level: confidenceLevel(activeMonths, productBills.length), activeMonths, billCount: productBills.length },
      };
    }).sort((a, b) => b.predictedNextMonth - a.predictedNextMonth).slice(0, 10);
    const forecastConfidence = {
      level: confidenceLevel(historyMonthKeys.size, history.length),
      monthsWithSales: historyMonthKeys.size,
      monthsRequired: 3,
      billCount: history.length,
      periodStart: `${monthName(parts(forecastStart).getUTCMonth(), true)} ${parts(forecastStart).getUTCFullYear()}`,
      periodEnd: `${monthName(parts(new Date(forecastEnd - 1)).getUTCMonth(), true)} ${parts(new Date(forecastEnd - 1)).getUTCFullYear()}`,
    };
    res.json({
      period: { year, month, monthName: monthName(month, true), incomplete },
      summary: { totalRevenue, totalBills: bills.length, prevRevenue, revenueGrowth: incomplete ? null : growth(totalRevenue, prevRevenue) },
      topProducts: products(bills).slice(0, 10), dailyRevenue, projects: [], nextMonthPredictions, forecastConfidence,
      calculationNotes: [...notes, 'Next-month quantities = total base-unit quantity over exactly three completed calendar months / 3, including zero-sale months. No automatic growth uplift. Demand bands: high > 5, medium > 2, otherwise low; these are fixed labels, not measured trends.', `Forecast history: ${monthName(fp.getUTCMonth() - 3, true)} ${parts(forecastStart).getUTCFullYear()} through ${monthName(fp.getUTCMonth() - 1, true)} ${parts(new Date(forecastEnd - 1)).getUTCFullYear()}.`, ...(incomplete ? ['This period is incomplete or future. Growth against a full previous month is suppressed.'] : []), 'Average bill value = sales / bill count; zero when there are no bills.'],
    });
  } catch (err) { console.error('Monthly analysis error:', err); res.status(500).json({ error: 'Failed to fetch monthly analysis' }); }
};
exports.getYearlyAnalysis = async (req, res) => {
  const p = period(req.query);
  if (!p) return res.status(400).json({ error: 'Use an integer year.' });
  try {
    const { year, now } = p;
    const start = boundary(year, 0), end = boundary(year + 1, 0);
    const incomplete = end > new Date();
    const bills = await fetchBills(start, end);
    const prevBills = await fetchBills(boundary(year - 1, 0), start);
    const totalRevenue = sum(bills), prevRevenue = sum(prevBills);
    const revenueGrowth = incomplete ? null : growth(totalRevenue, prevRevenue);
    const breakdown = rows => Array.from({ length: 12 }, (_, m) => {
      const selected = rows.filter(b => parts(b.bill_date).getUTCMonth() === m);
      return { month: monthName(m), revenue: sum(selected), bills: selected.length };
    });
    const monthlyData = breakdown(bills), prevMonthlyData = breakdown(prevBills);
    const expenses = await db.expenses.findAll({ where: { expense_date: range(`${year}-01-01`, `${year + 1}-01-01`) }, attributes: ['amount'] });
    const totalExpenses = round(expenses.reduce((s, e) => s + amount(e.amount), 0));
    const topProducts = products(bills).slice(0, 10);
    // A repeat-year baseline avoids inventing growth or translating prices into units.
    const nextYearMonthlyTopProducts = Array.from({ length: 12 }, (_, m) => {
      const available = boundary(year, m + 1) <= new Date();
      return {
        month: monthName(m, true),
        available,
        products: available
          ? products(bills.filter(b => parts(b.bill_date).getUTCMonth() === m))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 3)
            .map(p => ({ productId: p.productId, name: p.name, predictedQty: p.qty }))
          : [],
      };
    });
    const completedMonths = year < now.getUTCFullYear() ? 12 : year === now.getUTCFullYear() ? now.getUTCMonth() : 0;
    const closed = monthlyData.slice(0, completedMonths);
    const currentClosedBills = bills.filter(b => parts(b.bill_date).getUTCMonth() < completedMonths);
    const previousComparableBills = prevBills.filter(b => parts(b.bill_date).getUTCMonth() < completedMonths);
    const currentProducts = products(currentClosedBills);
    const currentProductMap = new Map(currentProducts.map(p => [Number(p.productId), p]));
    const previousProducts = new Map(products(previousComparableBills).map(p => [Number(p.productId), p]));
    const comparableProducts = [...previousProducts.values()]
      .filter(previous => previous.revenue > 0)
      .map(previous => {
        const current = currentProductMap.get(Number(previous.productId));
        const currentRevenue = current?.revenue || 0;
        return {
          productId: previous.productId,
          name: current?.name || previous.name,
          currentRevenue,
          previousRevenue: previous.revenue,
          growthPercent: growth(currentRevenue, previous.revenue),
        };
      });
    const strongestMonth = closed.length ? closed.reduce((best, row, index) => row.revenue > best.revenue ? { ...row, monthIndex: index } : best, { ...closed[0], monthIndex: 0 }) : null;
    const weakestMonth = closed.length ? closed.reduce((worst, row, index) => row.revenue < worst.revenue ? { ...row, monthIndex: index } : worst, { ...closed[0], monthIndex: 0 }) : null;
    const fastestGrowingProduct = comparableProducts.filter(p => p.growthPercent > 0).sort((a, b) => b.growthPercent - a.growthPercent)[0] || null;
    const decliningProducts = comparableProducts.filter(p => p.growthPercent < 0).sort((a, b) => a.growthPercent - b.growthPercent).slice(0, 5);
    const performanceHighlights = { strongestMonth, weakestMonth, fastestGrowingProduct, decliningProducts, comparisonMonths: completedMonths };
    const average = completedMonths ? closed.reduce((s, m) => s + m.revenue, 0) / completedMonths : 0;
    const low = closed.filter(m => m.revenue < average * 0.7);
    const improvements = [];
    if (low.length) improvements.push({ type: 'warning', text: `${low.map(m => m.month).join(', ')} had revenue below 70% of the average for completed months. Review seasonality before planning promotions.` });
    if (totalRevenue > 0 && totalExpenses > totalRevenue * 0.4) improvements.push({ type: 'warning', text: 'Recorded expenses exceed 40% of sales. This is a review threshold, not a profit-margin calculation.' });
    if (revenueGrowth !== null) improvements.push({ type: revenueGrowth < 0 ? 'danger' : 'info', text: `Sales changed ${revenueGrowth}% against the previous complete year.` });
    if (topProducts.length) improvements.push({ type: 'info', text: `"${topProducts[0].name}" ranks first by allocated sales value, not by quantity or profit.` });
    res.json({
      period: { year, prevYear: year - 1, incomplete },
      summary: { totalRevenue, totalBills: bills.length, prevRevenue, revenueGrowth, totalExpenses, salesLessExpenses: round(totalRevenue - totalExpenses) },
      monthlyData, prevMonthlyData, topProducts, projects: [],
      prediction: { nextYearRevenue: incomplete ? null : totalRevenue, growthRate: incomplete ? null : 0 },
      nextYearMonthlyTopProducts, improvements, performanceHighlights,
      calculationNotes: [...notes, 'Sales less recorded expenses is not net profit: historical cost of goods sold is not stored on bill items, and the expense register includes categories such as asset purchases.', 'Monthly product forecasts unlock separately when the matching month in the selected year is complete. Each available next-year month repeats its base-unit quantities without a growth multiplier. Zero-sale months remain zero.', 'Annual revenue forecasts and growth comparisons are unavailable for incomplete or future years. Low-month insights use completed months only. Expense query failures report an error instead of a false zero.'],
    });
  } catch (err) { console.error('Yearly analysis error:', err); res.status(500).json({ error: 'Failed to fetch yearly analysis' }); }
};

exports.getAnalysisDetails = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const hasMonth = req.query.month !== undefined;
    const month = hasMonth ? Number(req.query.month) : null;
    const hasDay = req.query.day !== undefined;
    const day = hasDay ? Number(req.query.day) : null;
    const hasProduct = req.query.productId !== undefined;
    const productId = hasProduct ? Number(req.query.productId) : null;
    const scope = req.query.scope;
    if (!Number.isInteger(year) || year < 1900 || year > 9998
      || (hasMonth && (!Number.isInteger(month) || month < 0 || month > 11))
      || (hasDay && (!hasMonth || !Number.isInteger(day) || day < 1 || day > new Date(Date.UTC(year, month + 1, 0)).getUTCDate()))
      || (hasProduct && (!Number.isInteger(productId) || productId < 1))
      || (scope !== undefined && scope !== 'forecast')
      || (scope === 'forecast' && !hasMonth)) {
      return res.status(400).json({ error: 'Invalid analysis detail filters.' });
    }

    let start = hasDay ? boundary(year, month, day) : hasMonth ? boundary(year, month) : boundary(year, 0);
    let end = hasDay ? boundary(year, month, day + 1) : hasMonth ? boundary(year, month + 1) : boundary(year + 1, 0);
    if (scope === 'forecast') {
      const now = parts(new Date());
      end = new Date(Math.min(end.getTime(), boundary(now.getUTCFullYear(), now.getUTCMonth()).getTime()));
      const endParts = parts(end);
      start = boundary(endParts.getUTCFullYear(), endParts.getUTCMonth() - 3);
    }
    const detailsInclude = [
      { model: db.bill_items, include: [{ model: db.products, attributes: ['product_name'] }] },
      { model: db.customers, attributes: ['customer_name'], required: false },
    ];
    const sourceBills = await db.bills.findAll({
      where: { bill_date: range(start, end), status: { [Op.in]: ['PAID', 'PARTIAL', 'UNPAID'] } },
      include: detailsInclude,
      order: [['bill_date', 'DESC']],
    });
    const selectedBills = hasProduct
      ? sourceBills.filter(b => (b.bill_items || []).some(item => Number(item.product_id) === productId))
      : sourceBills;
    const bills = selectedBills.map(bill => {
      const billItems = allocatedItems(bill).filter(item => !hasProduct || Number(item.productId) === productId);
      return {
        billId: bill.bill_id,
        billNo: bill.bill_no,
        date: bill.bill_date,
        customer: bill.customer?.customer_name || 'Walk-in customer',
        status: bill.status,
        billTotal: amount(bill.total_amount),
        items: billItems.map(item => ({ ...item, qty: round(item.qty), allocatedRevenue: round(item.allocatedRevenue) })),
      };
    });
    const matchedItems = bills.flatMap(b => b.items);
    res.json({
      filters: { year, month, day, productId, scope: scope || null },
      summary: {
        billCount: bills.length,
        billTotal: round(bills.reduce((s, b) => s + b.billTotal, 0)),
        matchedQuantity: round(matchedItems.reduce((s, item) => s + item.qty, 0)),
        allocatedRevenue: round(matchedItems.reduce((s, item) => s + item.allocatedRevenue, 0)),
      },
      bills,
    });
  } catch (err) {
    console.error('Analysis details error:', err);
    res.status(500).json({ error: 'Failed to fetch analysis details' });
  }
};
