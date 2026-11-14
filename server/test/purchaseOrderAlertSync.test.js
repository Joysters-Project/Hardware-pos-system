const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { Op } = require('sequelize');

const state = {
  alerts: [],
  purchaseOrders: [],
  poItems: [],
};

function matches(record, where = {}) {
  for (const key of Reflect.ownKeys(where)) {
    if (typeof key === 'symbol') continue;
    const expected = where[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      for (const operator of Reflect.ownKeys(expected)) {
        if (operator === Op.in && !expected[operator].includes(record[key])) return false;
        if (operator === Op.ne && expected[operator] === record[key]) return false;
      }
    } else if (record[key] !== expected) {
      return false;
    }
  }
  return true;
}

function makePO(data) {
  const purchaseOrder = {
    po_id: state.purchaseOrders.length + 1,
    ...data,
    toJSON() { return { ...this, toJSON: undefined }; },
  };
  state.purchaseOrders.push(purchaseOrder);
  return purchaseOrder;
}

const db = {
  sequelize: {
    async transaction() {
      return {
        finished: null,
        async commit() { this.finished = 'commit'; },
        async rollback() { this.finished = 'rollback'; },
      };
    },
  },
  purchase_orders: {
    async max() { return state.purchaseOrders.length; },
    async create(data) { return makePO(data); },
    async findByPk(id) {
      const po = state.purchaseOrders.find(order => order.po_id === Number(id));
      if (!po) return null;
      return {
        ...po,
        supplier: null,
        po_items: state.poItems.filter(item => item.po_id === po.po_id),
        toJSON() {
          return {
            po_id: po.po_id,
            po_number: po.po_number,
            status: po.status,
            supplier_id: po.supplier_id,
            total_amount: po.total_amount,
          };
        },
      };
    },
  },
  po_items: {
    async bulkCreate(items) { state.poItems.push(...items); },
  },
  alerts: {
    async update(values, { where = {} }) {
      const rows = state.alerts.filter(alert => matches(alert, where));
      rows.forEach(alert => Object.assign(alert, values));
      return [rows.length];
    },
  },
  products: {},
  suppliers: {},
  auto_reorder_suggestions: {},
  batch_inventory: {},
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === '../models' && /server[\\/]controllers[\\/]RR_purchaseOrderController\.js$/.test(parent.filename)) {
    return db;
  }
  if (request === '../services/auditService') return { logActivity: async () => {} };
  if (request === '../services/supplierPaymentService') return { createPaymentRecord: async () => {} };
  if (request === '../services/emailService') return { sendPOCreatedEmail: async () => {} };
  if (request === '../services/procurementNotificationService') return { createNotification: async () => {} };
  if (request === '../services/forecastService') return {};
  if (request === '../services/supplierPerformanceService') return {};
  if (request === '../services/alertService') return {};
  if (request === '../services/batchService') return { getStoreLocalDate: () => '2026-11-14' };
  return originalLoad.call(this, request, parent, ...args);
};

const purchaseOrderController = require('../controllers/RR_purchaseOrderController');
Module._load = originalLoad;

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('creating repeated POs preserves one Purchase Ordered alert linked to the latest PO', async () => {
  state.alerts = [{
    alert_id: 1,
    product_id: 3,
    alert_type: 'Low Stock',
    status: 'Active',
    purchase_order_id: null,
    is_resolved: false,
  }];
  state.purchaseOrders = [];
  state.poItems = [];
  const emitted = [];
  const req = {
    body: { supplier_id: 8, items: [{ product_id: 3, quantity: 12, unit_price: 5 }] },
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    app: { get: () => ({ emit: event => emitted.push(event) }) },
  };

  const firstResponse = response();
  await purchaseOrderController.createPurchaseOrder(req, firstResponse);
  assert.equal(firstResponse.statusCode, 201);
  assert.equal(state.alerts[0].status, 'Purchase Ordered');
  assert.equal(state.alerts[0].purchase_order_id, 1);

  const secondResponse = response();
  await purchaseOrderController.createPurchaseOrder(req, secondResponse);
  assert.equal(secondResponse.statusCode, 201);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, 'Purchase Ordered');
  assert.equal(state.alerts[0].purchase_order_id, 2);
  assert.deepEqual(emitted, ['alerts:updated', 'alerts:updated']);
});
