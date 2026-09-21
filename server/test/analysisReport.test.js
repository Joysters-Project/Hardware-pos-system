const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { Op } = require('sequelize');
const calls = [];
let billResults = [], expenseResults = [], expenseError = false;
const db = {
  bills: { findAll: async q => { calls.push(q); return billResults.shift() || []; } },
  bill_items: {}, products: {},
  expenses: { findAll: async () => { if (expenseError) throw new Error('Unavailable'); return expenseResults; } },
};
const original = Module._load;
Module._load = function(name, parent, ...rest) {
  if (name === '../models' && parent.filename.endsWith('analysisReportController.js')) return db;
  return original.call(this, name, parent, ...rest);
};
const controller = require('../controllers/analysisReportController');
Module._load = original;
async function run(method, query, rows, expenses = []) {
  calls.length = 0; billResults = rows; expenseResults = expenses;
  let status = 200, body;
  await controller[method]({ query }, { status(n) { status = n; return this; }, json(v) { body = v; } });
  return { status, body };
}
const bill = (total, date, items = []) => ({ total_amount: total, bill_date: date, bill_items: items });
const item = (id, qty, total) => ({ product_id: id, quantity: qty, total_price: total, product: { product_name: 'Same name' } });
test('monthly: discounts reconcile, duplicate names stay separate, timezone and exact history window', async () => {
  const rows = [bill('90.00', '2024-01-31T18:30:00Z', [item(1, 3, 60), item(2, 2, 40)])];
  const { body } = await run('getMonthlyAnalysis', { year: '2024', month: '1' }, [rows, [bill(60)], [bill(90, '2024-01-01', [item(1, 9, 90)])]]);
  assert.equal(body.summary.totalRevenue, 90);
  assert.equal(body.summary.revenueGrowth, 50);
  assert.equal(body.dailyRevenue.length, 29);
  assert.equal(body.dailyRevenue[0].revenue, 90);
  assert.deepEqual(body.topProducts.map(p => p.revenue), [54, 36]);
  assert.equal(body.topProducts.length, 2);
  assert.equal(body.nextMonthPredictions[0].predictedNextMonth, 3);
  assert.equal(calls[2].where.bill_date[Op.gte].toISOString(), '2023-11-30T18:30:00.000Z');
  assert.equal(calls[2].where.bill_date[Op.lt].toISOString(), '2024-02-29T18:30:00.000Z');
});
test('yearly: expense balance is not profit; declining sales do not contradict forecast', async () => {
  const { body } = await run('getYearlyAnalysis', { year: 2024 }, [[bill(80, '2024-01-02', [item(1, 4, 80)])], [bill(100, '2023-02-01', [item(2, 10, 100)])]], [{ amount: '20.10' }]);
  assert.equal(body.summary.revenueGrowth, -20);
  assert.equal(body.summary.salesLessExpenses, 59.9);
  assert.equal(body.summary.netProfit, undefined);
  assert.equal(body.prediction.nextYearRevenue, 80);
  assert.equal(body.prediction.growthRate, 0);
  assert.equal(body.nextYearMonthlyTopProducts[0].products[0].predictedQty, 4);
  assert.equal(body.nextYearMonthlyTopProducts[0].available, true);
  assert.deepEqual(body.nextYearMonthlyTopProducts[1].products, []);
  assert.equal(body.monthlyData.reduce((s,m) => s+m.revenue,0), 80);
});
test('zero baselines, future periods, invalid inputs and default month', async () => {
  let r = await run('getYearlyAnalysis', { year: 9998 }, [[], []]);
  assert.equal(r.body.summary.revenueGrowth, null);
  assert.equal(r.body.prediction.nextYearRevenue, null);
  assert.deepEqual(r.body.improvements, []);
  for (const query of [{month: '12'}, {month: 'abc'}, {year: ''}, {year:'2024oops'}]) {
    r = await run('getMonthlyAnalysis', query, []);
    assert.equal(r.status, 400);
    assert.equal(calls.length, 0);
  }
  r = await run('getMonthlyAnalysis', {}, [[], [], []]);
  assert.equal(r.status, 200);
  assert(Number.isInteger(r.body.period.month));
  assert.equal(r.body.summary.totalRevenue, 0);
});
test('expense failures are not converted into zero expenses', async () => {
  expenseError = true;
  try {
    const r = await run('getYearlyAnalysis', {year: 2024}, [[], []]);
    assert.equal(r.status, 500);
  } finally { expenseError = false; }
});

test('current-year monthly forecasts unlock after each source month completes', async () => {
  const now = new Date(Date.now() + 330 * 60000);
  const year = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const januaryBill = bill(50, `${year}-01-15T12:00:00+05:30`, [item(1, 5, 50)]);
  const { body } = await run('getYearlyAnalysis', { year }, [[januaryBill], []]);

  assert.equal(body.nextYearMonthlyTopProducts[0].available, currentMonth > 0);
  if (currentMonth > 0) assert.equal(body.nextYearMonthlyTopProducts[0].products[0].predictedQty, 5);
  assert.equal(body.nextYearMonthlyTopProducts[currentMonth].available, false);
  assert.deepEqual(body.nextYearMonthlyTopProducts[currentMonth].products, []);
});

test('cent allocation and zero-price products remain finite', async () => {
  const { body } = await run('getMonthlyAnalysis', { year: 2024, month: 0 }, [[bill('0.10', '2024-01-01', [item(1, 1, 1), item(2, 1, 1), item(3, 1, 1)]), bill(0, '2024-01-02', [item(4, 1, 0)])], [], []]);
  assert.equal(Math.round(body.topProducts.reduce((s,p) => s+p.revenue,0)*100), 10);
  assert(body.topProducts.every(p => Number.isFinite(p.revenue)));
  assert.equal(body.summary.revenueGrowth, null);
  assert.equal(calls[1].where.bill_date[Op.gte].toISOString(), '2023-11-30T18:30:00.000Z');
});
