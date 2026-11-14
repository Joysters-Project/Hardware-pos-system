const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { Op } = require('sequelize');

const state = {
  batches: [],
  alerts: [],
  disposals: [],
  product: null,
  nextAlertId: 1,
  nextDisposalId: 1,
};

function makeBatch(data) {
  return {
    ...data,
    async update(values) {
      Object.assign(this, values);
      return this;
    },
  };
}

function matches(record, where = {}) {
  for (const key of Reflect.ownKeys(where)) {
    const expected = where[key];
    if (typeof key === 'symbol') continue;
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      for (const operator of Reflect.ownKeys(expected)) {
        const value = expected[operator];
        if (operator === Op.gt && !(Number(record[key]) > Number(value))) return false;
        if (operator === Op.lt && !(String(record[key]) < String(value))) return false;
        if (operator === Op.ne && record[key] === value) return false;
        if (operator === Op.in && !value.includes(record[key])) return false;
        if (operator === Op.notIn && value.includes(record[key])) return false;
      }
    } else if (record[key] !== expected) {
      return false;
    }
  }
  return true;
}

function transaction() {
  return {
    LOCK: { UPDATE: 'UPDATE' },
    finished: null,
    async commit() { this.finished = 'commit'; },
    async rollback() { this.finished = 'rollback'; },
  };
}

const db = {
  sequelize: {
    async transaction() { return transaction(); },
  },
  batch_inventory: {
    sequelize: { literal: value => value },
    async findAll({ where = {} }) {
      return state.batches.filter(batch => matches(batch, where));
    },
    async findOne({ where = {} }) {
      return state.batches.find(batch => matches(batch, where)) || null;
    },
    async findByPk(id) {
      return state.batches.find(batch => Number(batch.batch_id) === Number(id)) || null;
    },
  },
  products: {
    async findByPk() { return state.product; },
    async update(values) { Object.assign(state.product, values); },
  },
  alerts: {
    async findOne({ where = {} }) {
      return state.alerts.find(alert => matches(alert, where)) || null;
    },
    async findAll({ where = {} }) {
      return state.alerts.filter(alert => matches(alert, where));
    },
    async create(values) {
      const alert = {
        alert_id: state.nextAlertId++,
        ...values,
        async update(changes) { Object.assign(this, changes); },
      };
      state.alerts.push(alert);
      return alert;
    },
    async update(values, { where = {} }) {
      const rows = state.alerts.filter(alert => matches(alert, where));
      rows.forEach(alert => Object.assign(alert, values));
      return [rows.length];
    },
  },
  expired_stock_disposals: {
    async create(values) {
      const disposal = { disposal_id: state.nextDisposalId++, ...values };
      state.disposals.push(disposal);
      return disposal;
    },
    async findAll({ where = {} }) {
      return state.disposals.filter(disposal => matches(disposal, where));
    },
  },
  purchase_orders: {},
  po_items: {},
  suppliers: {},
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === '../models' && /server[\\/]services[\\/](batchService|alertService)\.js$/.test(parent.filename)) {
    return db;
  }
  if (request === '../models' && /server[\\/]controllers[\\/]batchController\.js$/.test(parent.filename)) {
    return db;
  }
  return originalLoad.call(this, request, parent, ...args);
};

const { EXPIRED_BATCH_ALERT, syncExpiredBatchAlerts } = require('../services/alertService');
const batchController = require('../controllers/batchController');
Module._load = originalLoad;
const { getStoreLocalDate } = require('../services/batchService');

function reset(batches, stock = 0) {
  state.batches = batches.map((batch, index) => makeBatch({ batch_id: index + 1, ...batch }));
  state.alerts = [];
  state.disposals = [];
  state.product = {
    product_id: 1,
    product_name: 'Sample Product',
    status: 'active',
    stock_quantity: stock,
    min_stock_quantity: 0,
    batch_no: null,
    expiry_date: null,
  };
  state.nextAlertId = 1;
  state.nextDisposalId = 1;
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('creates one active alert per expired batch with positive remaining stock', async () => {
  reset([
    { batch_number: 'EXPIRED-10', product_id: 1, expiry_date: '2020-01-01', remaining_quantity: 10, status: 'Expired' },
    { batch_number: 'EXPIRED-0', product_id: 1, expiry_date: '2020-01-01', remaining_quantity: 0, status: 'Expired' },
    { batch_number: 'EXPIRES-TODAY', product_id: 1, expiry_date: getStoreLocalDate(), remaining_quantity: 5, status: 'Active' },
    { batch_number: 'VALID', product_id: 1, expiry_date: '2099-01-01', remaining_quantity: 5, status: 'Active' },
  ]);

  await syncExpiredBatchAlerts(1);
  await syncExpiredBatchAlerts(1);

  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].batch_id, state.batches[0].batch_id);
  assert.equal(state.alerts[0].alert_type, 'Expired');
  assert.equal(state.alerts[0].is_resolved, false);

  state.batches[0].remaining_quantity = 0;
  await syncExpiredBatchAlerts(1);
  assert.equal(state.alerts[0].is_resolved, true);
});

test('partial and full disposals affect only the targeted batch and preserve disposal history', async () => {
  reset([
    { batch_number: 'EXPIRED-10', product_id: 1, expiry_date: '2020-01-01', remaining_quantity: 10, status: 'Expired' },
    { batch_number: 'VALID-7', product_id: 1, expiry_date: '2099-01-01', remaining_quantity: 7, status: 'Active' },
  ], 17);
  await syncExpiredBatchAlerts(1);

  const partialResponse = response();
  await batchController.disposeBatch({
    params: { id: '1' },
    body: { quantity: 4, disposal_date: '2026-11-14', disposal_reason: 'Packaging damaged' },
    app: { get: () => null },
  }, partialResponse);

  assert.equal(partialResponse.statusCode, 200);
  assert.equal(state.batches[0].remaining_quantity, 6);
  assert.equal(state.batches[0].status, 'Expired');
  assert.equal(state.batches[1].remaining_quantity, 7);
  assert.equal(state.product.stock_quantity, 7);
  assert.equal(state.alerts[0].is_resolved, false);
  assert.deepEqual(
    [state.disposals[0].product_name, state.disposals[0].batch_number, state.disposals[0].expired_quantity,
      state.disposals[0].disposal_date, state.disposals[0].disposal_reason],
    ['Sample Product', 'EXPIRED-10', 4, '2026-11-14', 'Packaging damaged']
  );

  const fullResponse = response();
  await batchController.disposeBatch({
    params: { id: '1' },
    body: { quantity: 6, disposal_date: '2026-11-14', disposal_reason: 'Remaining expired units' },
    app: { get: () => null },
  }, fullResponse);

  assert.equal(fullResponse.statusCode, 200);
  assert.equal(state.batches[0].remaining_quantity, 0);
  assert.equal(state.batches[0].status, 'Disposed');
  assert.equal(state.batches[1].remaining_quantity, 7);
  assert.equal(state.product.stock_quantity, 7);
  assert.equal(state.alerts[0].is_resolved, true);
  assert.equal(state.disposals.length, 2);

  const historyResponse = response();
  await batchController.getDisposalHistory({ query: { batch_id: '1' } }, historyResponse);
  assert.equal(historyResponse.statusCode, 200);
  assert.equal(historyResponse.body.length, 2);
});
