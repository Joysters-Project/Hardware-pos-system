const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('department detail, update and delete support the installed Sequelize API', async () => {
  const data = { department_id: 42, department_name: 'Test Department', budget: 1000,
    status: 'Active', employees: [], assets: [{ cost: 100, status: 'Active' }] };
  let destroyed = false;
  const department = {
    ...data,
    toJSON: () => data,
    update: async payload => Object.assign(data, payload),
    destroy: async () => { destroyed = true; },
  };
  // Sequelize 3 provides findById, not findByPk or Sequelize.Op.
  const db = {
    Sequelize: {},
    departments: { findById: async () => department },
    employees: { findAll: async () => [], count: async () => 0 },
    assets: {}, expenses: {},
  };
  const originalLoad = Module._load;
  const controllerPath = require.resolve('../controllers/departmentController');
  delete require.cache[controllerPath];
  let controller;
  try {
    Module._load = function (name, ...args) {
      if (name === '../models') return db;
      if (name === '../services/auditService') return { logActivity: async () => {} };
      return originalLoad.call(this, name, ...args);
    };
    controller = require(controllerPath);
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
  const response = () => ({
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const req = { params: { id: '42' }, headers: {}, body: { status: 'Inactive' } };
  let res = response();
  await controller.getDepartmentById(req, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.used_budget, 100);
  assert.equal(res.body.remaining_budget, 900);
  res = response();
  await controller.updateDepartment(req, res);
  assert.equal(res.code, 200);
  assert.equal(data.status, 'Inactive');
  res = response();
  await controller.deleteDepartment(req, res);
  assert.equal(res.code, 200);
  assert.equal(destroyed, true);
});
