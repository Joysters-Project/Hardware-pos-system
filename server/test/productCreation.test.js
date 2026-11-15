const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { batchCreateCalls: [], createdProduct: null };
const transaction = {
  finished: null,
  async commit() { this.finished = 'commit'; },
  async rollback() { this.finished = 'rollback'; },
};

const db = {
  sequelize: {
    async transaction() { return transaction; },
  },
  products: {
    async create(data) {
      state.createdProduct = {
        ...data,
        product_id: 42,
        async reload() { return this; },
      };
      return state.createdProduct;
    },
  },
  product_units: {
    async bulkCreate() {},
  },
  batch_inventory: {
    async create(data) { state.batchCreateCalls.push(data); },
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === '../models' && /server[\\/]controllers[\\/]productController\.js$/.test(parent.filename)) {
    return db;
  }
  if (request === '../services/auditService' && /server[\\/]controllers[\\/]productController\.js$/.test(parent.filename)) {
    return { logActivity: async () => {} };
  }
  if (request === '../services/alertService' && /server[\\/]controllers[\\/]productController\.js$/.test(parent.filename)) {
    return { syncAlertsForProduct: async () => {} };
  }
  if (request === '../services/batchService' && /server[\\/]controllers[\\/]productController\.js$/.test(parent.filename)) {
    return {
      getProductBatchSummaries: async () => new Map(),
      getStoreLocalDate: () => '2026-11-15',
      syncProductFromBatches: async () => {},
    };
  }
  return originalLoad.call(this, request, parent, ...args);
};

const productController = require('../controllers/productController');
Module._load = originalLoad;

test('creating a product with initial stock does not create a batch record', async () => {
  state.batchCreateCalls = [];
  state.createdProduct = null;
  transaction.finished = null;

  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await productController.createProduct({
    body: {
      product_name: 'New Product',
      unit_price: 10,
      cost_price: 5,
      stock_quantity: 12,
      barcode: null,
      alternative_units: [],
    },
    headers: {},
    socket: {},
    app: { get: () => null },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(state.createdProduct.stock_quantity, 12);
  assert.equal(state.batchCreateCalls.length, 0);
  assert.equal(transaction.finished, 'commit');
});
