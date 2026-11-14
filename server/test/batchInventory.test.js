const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { Op } = require('sequelize');

const state = {
  batches: [],
  alerts: [],
  product: null,
  purchaseOrder: null,
  otherPurchaseOrders: [],
  bills: [],
  billItems: [],
  payments: [],
  nextBillId: 1,
};

const makeBatch = (data) => ({
  ...data,
  async update(values) {
    Object.assign(this, values);
    return this;
  },
});

const makeAlert = (data) => ({
  ...data,
  async update(values) {
    Object.assign(this, values);
    return this;
  },
});

function matches(batch, where = {}) {
  for (const key of Reflect.ownKeys(where)) {
    const expected = where[key];
    if (key === Op.or) {
      if (!expected.some(clause => matches(batch, clause))) return false;
    } else if (typeof key === 'symbol') {
      continue;
    } else if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      for (const operator of Reflect.ownKeys(expected)) {
        const value = expected[operator];
        if (operator === Op.in && !value.includes(batch[key])) return false;
        if (operator === Op.notIn && value.includes(batch[key])) return false;
        if (operator === Op.gt && !(Number(batch[key]) > Number(value))) return false;
        if (operator === Op.lt && !(String(batch[key]) < String(value))) return false;
        if (operator === Op.ne && batch[key] === value) return false;
        if (operator === Op.gte && !(String(batch[key]) >= String(value))) return false;
      }
    } else if (batch[key] !== expected) {
      return false;
    }
  }
  return true;
}

const transaction = () => ({
  LOCK: { UPDATE: 'UPDATE' },
  finished: null,
  async commit() { this.finished = 'commit'; },
  async rollback() { this.finished = 'rollback'; },
});

const db = {
  sequelize: {
    async transaction(callback) {
      const tx = transaction();
      if (!callback) return tx;
      const snapshot = {
        batches: state.batches.map(batch => ({ ...batch })),
        product: state.product && { ...state.product },
        bills: state.bills.slice(),
        billItems: state.billItems.slice(),
        payments: state.payments.slice(),
        nextBillId: state.nextBillId,
      };
      try {
        const result = await callback(tx);
        await tx.commit();
        return result;
      } catch (error) {
        state.batches = snapshot.batches.map(makeBatch);
        state.product = snapshot.product;
        state.bills = snapshot.bills;
        state.billItems = snapshot.billItems;
        state.payments = snapshot.payments;
        state.nextBillId = snapshot.nextBillId;
        await tx.rollback();
        throw error;
      }
    },
  },
  batch_inventory: {
    sequelize: { literal: value => value },
    async findAll({ where }) {
      return state.batches
        .filter(batch => matches(batch, where))
        .sort((a, b) => {
          if (!a.expiry_date && b.expiry_date) return 1;
          if (a.expiry_date && !b.expiry_date) return -1;
          return String(a.expiry_date || '').localeCompare(String(b.expiry_date || '')) || a.batch_id - b.batch_id;
        });
    },
    async findOne({ where }) {
      return state.batches.find(batch => matches(batch, where)) || null;
    },
    async sum(field, { where }) {
      return state.batches.filter(batch => matches(batch, where))
        .reduce((sum, batch) => sum + Number(batch[field] || 0), 0);
    },
    async create(data) {
      const batch = makeBatch({ batch_id: state.batches.length + 1, ...data });
      state.batches.push(batch);
      return batch;
    },
  },
  products: {
    async findByPk() { return state.product; },
    async update(values) {
      Object.assign(state.product, values);
    },
  },
  alerts: {
    async findOne({ where = {} }) {
      return state.alerts.find(alert => matches(alert, where)) || null;
    },
    async findAll({ where = {} }) {
      return state.alerts.filter(alert => matches(alert, where));
    },
    async create(values) {
      const alert = makeAlert({ alert_id: state.alerts.length + 1, ...values });
      state.alerts.push(alert);
      return alert;
    },
    async update(values, { where = {} }) {
      const matching = state.alerts.filter(alert => matches(alert, where));
      matching.forEach(alert => Object.assign(alert, values));
      return [matching.length];
    },
  },
  purchase_orders: {
    async findByPk() { return state.purchaseOrder; },
    async findAll({ where = {}, include = [] }) {
      const productId = include[0]?.where?.product_id;
      return [state.purchaseOrder, ...state.otherPurchaseOrders]
        .filter(order => order && matches(order, where))
        .filter(order => order.po_items.some(item => Number(item.product_id) === Number(productId)))
        .map(order => ({ po_id: order.po_id }));
    },
  },
  po_items: {},
  suppliers: {},
  bills: {
    async findOne() { return null; },
    async count() { return state.bills.length; },
    async create(data) {
      const bill = { bill_id: state.nextBillId++, ...data, toJSON() { return { ...this }; } };
      state.bills.push(bill);
      return bill;
    },
  },
  bill_items: {
    async create(data) {
      state.billItems.push(data);
      return data;
    },
  },
  audit_log: {},
  customers: {},
  payments: {
    async create(data) { state.payments.push(data); return data; },
  },
  users: {},
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === '../models' && /server[\\/]services[\\/](batchService|billingService|alertService)\.js$/.test(parent.filename)) {
    return db;
  }
  if (request === '../models' && /server[\\/]controllers[\\/]batchController\.js$/.test(parent.filename)) {
    return db;
  }
  if (request === './auditService' && /billingService\.js$/.test(parent.filename)) {
    return { logActivity: async () => {} };
  }
  if (request === './alertService' && /billingService\.js$/.test(parent.filename)) {
    return { syncAlertsForProduct: async () => {} };
  }
  if (request === '../utils/phoneValidation' && /billingService\.js$/.test(parent.filename)) {
    return { validateSriLankanPhone: () => ({ isValid: true }) };
  }
  return originalLoad.call(this, request, parent, ...args);
};

const batchService = require('../services/batchService');
const batchController = require('../controllers/batchController');
const BillingService = require('../services/billingService');
Module._load = originalLoad;

function reset({ batches = [], stock = 0 } = {}) {
  state.batches = batches.map((batch, index) => makeBatch({ batch_id: index + 1, ...batch }));
  state.alerts = [];
  state.product = {
    product_id: 1,
    product_name: 'Milk Powder',
    status: 'active',
    stock_quantity: stock,
    min_stock_quantity: 0,
    batch_no: null,
    expiry_date: null,
  };
  state.purchaseOrder = {
    po_id: 7,
    supplier_id: 3,
    status: 'Shipped',
    po_items: [{ product_id: 1, quantity: 100, unit_price: 10 }],
    async update(values) { Object.assign(this, values); },
  };
  state.otherPurchaseOrders = [];
  state.bills = [];
  state.billItems = [];
  state.payments = [];
  state.nextBillId = 1;
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('receiving a PO adds a distinct batch and FEFO sales switch the active batch', async () => {
  reset({
    stock: 50,
    batches: [{
      batch_id: 1,
      batch_number: 'B001',
      product_id: 1,
      received_quantity: 50,
      remaining_quantity: 50,
      expiry_date: '2096-12-10',
      status: 'Active',
    }],
  });

  const res = response();
  await batchController.receiveOrderItem({
    body: {
      po_id: 7,
      product_id: 1,
      supplier_batch_number: 'B002',
      expiry_date: '2097-06-10',
      received_date: '2096-11-06',
      received_quantity: 100,
    },
    app: { get: () => null },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(state.batches.map(batch => batch.batch_number), ['B001', 'B002']);
  assert.equal(state.batches[0].expiry_date, '2096-12-10');
  assert.equal(state.product.stock_quantity, 150);
  assert.equal(state.product.batch_no, 'B001');

  await batchService.deductStockFEFO(1, 20, transaction());
  assert.deepEqual(state.batches.map(batch => batch.remaining_quantity), [30, 100]);
  assert.equal(state.product.stock_quantity, 130);

  await batchService.deductStockFEFO(1, 40, transaction());
  assert.deepEqual(state.batches.map(batch => batch.remaining_quantity), [0, 90]);
  assert.equal(state.product.stock_quantity, 90);
  assert.equal(state.product.batch_no, 'B002');
  assert.equal(state.product.expiry_date, '2097-06-10');
});

test('partial PO receipt keeps its linked alert ordered and full receipt recalculates it without duplicates', async () => {
  reset({ stock: 0 });
  state.product.min_stock_quantity = 150;
  state.product.reorder_level = 5;
  state.purchaseOrder.po_items[0].quantity = 100;
  state.alerts.push(makeAlert({
    alert_id: 1,
    product_id: 1,
    alert_type: 'Low Stock',
    status: 'Purchase Ordered',
    purchase_order_id: 7,
    is_resolved: false,
  }));

  const receive = async (batchNumber, quantity) => {
    const res = response();
    await batchController.receiveOrderItem({
      body: {
        po_id: 7,
        product_id: 1,
        supplier_batch_number: batchNumber,
        expiry_date: '2097-06-10',
        received_date: '2096-11-06',
        received_quantity: quantity,
      },
      app: { get: () => null },
    }, res);
    return res;
  };

  assert.equal((await receive('PO-7-A', 40)).statusCode, 201);
  assert.equal(state.purchaseOrder.status, 'Shipped');
  assert.equal(state.alerts[0].status, 'Purchase Ordered');
  assert.equal(state.alerts[0].purchase_order_id, 7);

  assert.equal((await receive('PO-7-B', 60)).statusCode, 201);
  assert.equal(state.purchaseOrder.status, 'Received');
  assert.equal(state.product.stock_quantity, 100);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, 'Active');
  assert.equal(state.alerts[0].purchase_order_id, null);
  assert.equal(state.alerts[0].is_resolved, false);
});

test('full PO receipt resolves a sufficient-stock alert and preserves history', async () => {
  reset({ stock: 0 });
  state.product.min_stock_quantity = 10;
  state.product.reorder_level = 5;
  state.purchaseOrder.po_items[0].quantity = 10;
  state.alerts.push(makeAlert({
    alert_id: 1,
    product_id: 1,
    alert_type: 'Out of Stock',
    status: 'Purchase Ordered',
    purchase_order_id: 7,
    is_resolved: false,
  }));

  const res = response();
  await batchController.receiveOrderItem({
    body: {
      po_id: 7,
      product_id: 1,
      supplier_batch_number: 'PO-7-FULL',
      expiry_date: '2097-06-10',
      received_date: '2096-11-06',
      received_quantity: 10,
    },
    app: { get: () => null },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(state.product.stock_quantity, 10);
  assert.equal(state.alerts[0].is_resolved, true);
  assert.equal(state.alerts[0].status, 'Resolved');
  assert.equal(state.alerts[0].purchase_order_id, null);
});

test('multiple open POs keep one linked alert ordered and re-evaluate it after the last receipt', async () => {
  reset({ stock: 0 });
  state.product.min_stock_quantity = 100;
  state.product.reorder_level = 5;
  state.purchaseOrder.po_items[0].quantity = 10;
  state.otherPurchaseOrders = [{
    po_id: 8,
    status: 'Shipped',
    po_items: [{ product_id: 1 }],
  }];
  state.alerts.push(makeAlert({
    alert_id: 1,
    product_id: 1,
    alert_type: 'Low Stock',
    status: 'Purchase Ordered',
    purchase_order_id: 7,
    is_resolved: false,
  }));

  const firstReceipt = response();
  await batchController.receiveOrderItem({
    body: {
      po_id: 7,
      product_id: 1,
      supplier_batch_number: 'PO-7-MULTI',
      expiry_date: '2097-06-10',
      received_date: '2096-11-06',
      received_quantity: 10,
    },
    app: { get: () => null },
  }, firstReceipt);

  assert.equal(firstReceipt.statusCode, 201);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, 'Purchase Ordered');
  assert.equal(state.alerts[0].purchase_order_id, 8);

  state.purchaseOrder = {
    po_id: 8,
    supplier_id: 3,
    status: 'Shipped',
    po_items: [{ product_id: 1, quantity: 5, unit_price: 10 }],
    async update(values) { Object.assign(this, values); },
  };
  state.otherPurchaseOrders = [{
    po_id: 7,
    status: 'Received',
    po_items: [{ product_id: 1 }],
  }];

  const secondReceipt = response();
  await batchController.receiveOrderItem({
    body: {
      po_id: 8,
      product_id: 1,
      supplier_batch_number: 'PO-8-MULTI',
      expiry_date: '2097-06-10',
      received_date: '2096-11-06',
      received_quantity: 5,
    },
    app: { get: () => null },
  }, secondReceipt);

  assert.equal(secondReceipt.statusCode, 201);
  assert.equal(state.product.stock_quantity, 15);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, 'Active');
  assert.equal(state.alerts[0].purchase_order_id, null);
});

test('FEFO skips expired stock and treats expiry today as valid', async () => {
  const today = batchService.getStoreLocalDate();
  reset({
    stock: 120,
    batches: [
      { batch_number: 'OLD', product_id: 1, received_quantity: 20, remaining_quantity: 20, expiry_date: '2000-01-01', status: 'Active' },
      { batch_number: 'TODAY', product_id: 1, received_quantity: 100, remaining_quantity: 100, expiry_date: today, status: 'Expired' },
    ],
  });

  const deductions = await batchService.deductStockFEFO(1, 5, transaction());
  assert.deepEqual(deductions.map(item => [item.batch_number, item.deducted]), [['TODAY', 5]]);
  assert.deepEqual(state.batches.map(batch => batch.remaining_quantity), [20, 95]);
});

test('legacy product stock without batch history is recorded and deducted from an opening batch', async () => {
  reset({ stock: 10 });
  state.product.batch_no = 'LEGACY-LOT';
  state.product.expiry_date = '2099-01-01';

  const deductions = await batchService.deductStockFEFO(1, 3, transaction());
  assert.deepEqual(deductions.map(item => [item.batch_number, item.deducted]), [['LEGACY-LOT', 3]]);
  assert.equal(state.batches.length, 1);
  assert.equal(state.batches[0].remaining_quantity, 7);
  assert.equal(state.product.stock_quantity, 7);
});

test('sale from only expired batches is rejected without creating a bill or changing stock', async () => {
  reset({
    stock: 20,
    batches: [{
      batch_number: 'EXPIRED',
      product_id: 1,
      received_quantity: 20,
      remaining_quantity: 20,
      expiry_date: '2000-01-01',
      status: 'Active',
    }],
  });
  state.product.status = 'Low Stock';

  await assert.rejects(
    BillingService.createInvoice({
      items: [{ product_id: 1, quantity: 5, conversion_factor: 1, price: 10 }],
      subtotal: 50,
      discount: 0,
      total_amount: 50,
      amount_paid: 50,
      balance_due: 0,
    }, 1),
    { message: 'This product batch has expired. Sales are not allowed.' }
  );
  assert.equal(state.bills.length, 0);
  assert.equal(state.billItems.length, 0);
  assert.equal(state.payments.length, 0);
  assert.equal(state.batches[0].remaining_quantity, 20);
});
