const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSalaryPeriod, getSalaryAlertState } = require('../utils/salaryLogic');

test('buildSalaryPeriod creates monthly dates from the selected month start', () => {
  const result = buildSalaryPeriod('monthly', '2026-07-15');
  assert.equal(result.pay_period_start_date, '2026-07-01');
  assert.equal(result.pay_period_end_date, '2026-07-31');
  assert.equal(result.due_date, '2026-07-31');
});

test('buildSalaryPeriod creates weekly dates for a 7-day pay period', () => {
  const result = buildSalaryPeriod('weekly', '2026-07-06');
  assert.equal(result.pay_period_start_date, '2026-07-06');
  assert.equal(result.pay_period_end_date, '2026-07-12');
  assert.equal(result.due_date, '2026-07-12');
});

test('getSalaryAlertState marks overdue records correctly', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const state = getSalaryAlertState(yesterday.toISOString().split('T')[0], 'Pending');
  assert.equal(state.needsAlert, true);
  assert.equal(state.severity, 'overdue');
  assert.equal(state.daysLate >= 1, true);
});
