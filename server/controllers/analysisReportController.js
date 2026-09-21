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
function period(query) {
  const now = parts(new Date());
  const year = query.year === undefined ? now.getUTCFullYear() : Number(query.year);
  const month = query.month === undefined ? now.getUTCMonth() : Number(query.month);
  if (!Number.isInteger(year) || year < 1900 || year > 9998 || !Number.isInteger(month) || month < 0 || month > 11 || query.year === '' || query.month === '') return null;
  return { year, month, now };
}
function products(bills) {
  const map = new Map();
  bills.forEach(bill => {
    const items = bill.bill_items || [];
    const lineTotal = items.reduce((s, i) => s + amount(i.total_price), 0);
    // Allocate the actual bill total, including bill-level discounts, in cents.
    let allocated = 0;
    let cumulative = 0;
    items.forEach(item => {
      const id = item.product_id;
      if (!map.has(id)) map.set(id, { productId: id, name: item.product?.product_name || `Product #${id}`, qty: 0, revenue: 0 });
      const row = map.get(id);
      row.qty += amount(item.quantity); // Stored in the product's base unit.
      cumulative += amount(item.total_price);
      const next = lineTotal > 0 ? Math.round(amount(bill.total_amount) * 100 * cumulative / lineTotal) : 0;
      row.revenue += (next - allocated) / 100;
      allocated = next;
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
    const nextMonthPredictions = products(history).map(p => ({ ...p, avgMonthlyQty: round(p.qty / 3), predictedNextMonth: round(p.qty / 3), trend: p.qty / 3 > 5 ? 'high' : p.qty / 3 > 2 ? 'medium' : 'low' })).sort((a, b) => b.predictedNextMonth - a.predictedNextMonth).slice(0, 10);
    res.json({
      period: { year, month, monthName: monthName(month, true), incomplete },
      summary: { totalRevenue, totalBills: bills.length, prevRevenue, revenueGrowth: incomplete ? null : growth(totalRevenue, prevRevenue) },
      topProducts: products(bills).slice(0, 10), dailyRevenue, projects: [], nextMonthPredictions,
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
      nextYearMonthlyTopProducts, improvements,
      calculationNotes: [...notes, 'Sales less recorded expenses is not net profit: historical cost of goods sold is not stored on bill items, and the expense register includes categories such as asset purchases.', 'Monthly product forecasts unlock separately when the matching month in the selected year is complete. Each available next-year month repeats its base-unit quantities without a growth multiplier. Zero-sale months remain zero.', 'Annual revenue forecasts and growth comparisons are unavailable for incomplete or future years. Low-month insights use completed months only. Expense query failures report an error instead of a false zero.'],
    });
  } catch (err) { console.error('Yearly analysis error:', err); res.status(500).json({ error: 'Failed to fetch yearly analysis' }); }
};
