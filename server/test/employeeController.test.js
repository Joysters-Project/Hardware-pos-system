const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const controllerPath = path.resolve(__dirname, '../controllers/employeeController.js');
const modelsPath = path.resolve(__dirname, '../models/index.js');
const auditPath = path.resolve(__dirname, '../services/auditService.js');
const phoneValidationPath = path.resolve(__dirname, '../utils/phoneValidation.js');

function loadControllerWithStub() {
  delete require.cache[require.resolve(controllerPath)];
  delete require.cache[require.resolve(modelsPath)];
  delete require.cache[require.resolve(auditPath)];
  delete require.cache[require.resolve(phoneValidationPath)];

  const originalLoad = Module._load;
  const stubDb = {
    employees: {
      findOne: async () => null,
      update: async () => null,
    },
    departments: {
      findOne: async () => ({ department_id: 1, budget: 1000 }),
    },
    Sequelize: {},
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../models') return stubDb;
    if (request === '../services/auditService') return { logActivity: async () => {} };
    if (request === '../utils/phoneValidation') return {
      validateSriLankanPhone: () => ({ isValid: true, formatted: '0771234567' }),
      normalizeSriLankanPhone: (v) => v,
    };
    return originalLoad.apply(this, arguments);
  };

  try {
    return require(controllerPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('updateEmployee handles missing Sequelize operator without crashing', async () => {
  const employee = {
    employee_id: 42,
    department_id: 1,
    first_name: 'Jane',
    last_name: 'Doe',
    phone_no: null,
    position: 'Developer',
    salary: 1000,
    salary_category: 'monthly',
    email: 'old@example.com',
    status: 'Active',
    profile_photo: null,
    update: async (payload) => Object.assign(employee, payload),
  };

  const stubDb = {
    employees: {
      findOne: async (options) => {
        const employeeId = options?.where?.employee_id;
        if (typeof employeeId === 'object') return null;
        if (employeeId === 42 || employeeId === '42') return employee;
        return null;
      },
      findAll: async () => [employee],
    },
    departments: {
      findOne: async () => ({ department_id: 1, budget: 1000 }),
    },
    Sequelize: {},
  };

  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === '../models') return stubDb;
    if (request === '../services/auditService') return { logActivity: async () => {} };
    if (request === '../utils/phoneValidation') return {
      validateSriLankanPhone: () => ({ isValid: true, formatted: '0771234567' }),
      normalizeSriLankanPhone: (v) => v,
    };
    return originalLoad.apply(this, arguments);
  };

  delete require.cache[require.resolve(controllerPath)];
  const controller = require(controllerPath);
  Module._load = originalLoad;

  const req = {
    params: { id: '42' },
    body: {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'new@example.com',
      phone_no: '0771234567',
      address: 'Updated',
      position: 'Senior Developer',
      salary: 1500,
      salary_category: 'monthly',
      join_date: '2024-01-01',
      status: 'Active',
      department_id: 1,
    },
    headers: {},
    socket: {},
    user: { user_id: 1, role: 'admin' },
  };

  const res = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await controller.updateEmployee(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'Employee updated successfully');
  assert.equal(employee.salary, 1500);
});
