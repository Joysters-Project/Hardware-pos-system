const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

let currentUser = null;
const auditCalls = [];

const users = {
  findOne: async () => currentUser,
  findByPk: async () => currentUser,
};

const bcryptStub = {
  compare: async (password, stored) => password === 'Correct1!' && stored === 'hashed-password',
  hash: async value => `hashed:${value}`,
};

const jwtStub = {
  sign: payload => `signed:${payload.user_id}:${payload.role}`,
  verify: token => {
    if (token === 'valid-token') return { user_id: 1, role: 'Admin' };
    throw new Error('invalid token');
  },
};

const originalLoad = Module._load;
Module._load = function(request, parent, ...rest) {
  if (request === '../models' && parent.filename.endsWith('authController.js')) return { users, employees: {} };
  if (request === '../services/auditService' && parent.filename.endsWith('authController.js')) {
    return { logActivity: async (...args) => auditCalls.push(args) };
  }
  if (request === 'bcrypt' && parent.filename.endsWith('authController.js')) return bcryptStub;
  if (request === 'jsonwebtoken' && parent.filename.endsWith('authController.js')) return jwtStub;
  return originalLoad.call(this, request, parent, ...rest);
};
const controller = require('../controllers/authController');
Module._load = originalLoad;

function makeUser(overrides = {}) {
  const user = {
    user_id: 1, user_name: 'admin-user', first_name: 'Admin', last_name: 'User',
    role: 'Admin', status: 'Active', password: 'hashed-password', failed_attempts: 0,
    is_locked: false, lock_time: null, employee: { department_id: 4 },
    async update(values) { Object.assign(this, values); },
    ...overrides,
  };
  return user;
}

async function runLogin(body) {
  let status = 200;
  let response;
  await controller.login(
    { body, headers: {}, socket: { remoteAddress: '127.0.0.1' } },
    { status(code) { status = code; return this; }, json(value) { response = value; } },
  );
  return { status, body: response };
}

test.beforeEach(() => { currentUser = makeUser(); auditCalls.length = 0; });

test('unknown users are rejected without revealing account details', async () => {
  currentUser = null;
  const result = await runLogin({ user_name: 'missing', password: 'Correct1!', role: 'Admin' });
  assert.equal(result.status, 401);
  assert.equal(result.body.message, 'Invalid Username or Password');
});

test('selected role must match the stored role case-insensitively', async () => {
  let result = await runLogin({ user_name: 'admin-user', password: 'Correct1!', role: 'Manager' });
  assert.equal(result.status, 403);
  assert.equal(result.body.message, 'Access denied');
  result = await runLogin({ user_name: 'admin-user', password: 'Correct1!', role: 'admin' });
  assert.equal(result.status, 200);
});

test('inactive users cannot authenticate', async () => {
  currentUser = makeUser({ status: 'Inactive' });
  const result = await runLogin({ user_name: 'admin-user', password: 'Correct1!', role: 'Admin' });
  assert.equal(result.status, 403);
  assert.equal(result.body.message, 'User is inactive');
});

test('temporarily locked accounts report remaining lock time', async () => {
  currentUser = makeUser({ is_locked: true, lock_time: new Date() });
  const result = await runLogin({ user_name: 'admin-user', password: 'Correct1!', role: 'Admin' });
  assert.equal(result.status, 403);
  assert.match(result.body.message, /Account locked\. Try again after \d+ minutes/);
});

test('incorrect passwords increment attempts and lock the fifth attempt', async () => {
  currentUser = makeUser({ failed_attempts: 3 });
  let result = await runLogin({ user_name: 'admin-user', password: 'Wrong', role: 'Admin' });
  assert.equal(result.status, 401);
  assert.equal(currentUser.failed_attempts, 4);
  assert.match(result.body.message, /1 attempts left/);
  result = await runLogin({ user_name: 'admin-user', password: 'Wrong', role: 'Admin' });
  assert.equal(result.status, 401);
  assert.equal(currentUser.is_locked, true);
  assert.match(result.body.message, /Account locked due to 5 failed login attempts/);
});

test('successful login resets attempts, signs role identity, and writes an audit event', async () => {
  currentUser = makeUser({ failed_attempts: 2 });
  const result = await runLogin({ user_name: 'admin-user', password: 'Correct1!', role: 'admin' });
  assert.equal(result.status, 200);
  assert.equal(result.body.token, 'signed:1:Admin');
  assert.equal(result.body.user.role, 'Admin');
  assert.equal(currentUser.failed_attempts, 0);
  assert.equal(auditCalls[0][2], 'LOGIN');
});

test('logout records the user and returns success', async () => {
  let status = 200;
  let response;
  await controller.logout(
    { body: { user_id: 1 }, headers: {}, socket: { remoteAddress: '127.0.0.1' } },
    { status(code) { status = code; return this; }, json(value) { response = value; } },
  );
  assert.equal(status, 200);
  assert.equal(response.message, 'Logout successful');
  assert.equal(auditCalls[0][2], 'LOGOUT');
});

test('authentication middleware rejects missing and invalid tokens and accepts a valid token', () => {
  const jwt = require('jsonwebtoken');
  const originalVerify = jwt.verify;
  jwt.verify = jwtStub.verify;
  delete require.cache[require.resolve('../middleware/authMiddleware')];
  const middleware = require('../middleware/authMiddleware');
  const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  let res = response();
  middleware({ headers: {} }, res, () => assert.fail('next should not run'));
  assert.equal(res.code, 401);
  res = response();
  middleware({ headers: { authorization: 'Bearer invalid' } }, res, () => assert.fail('next should not run'));
  assert.equal(res.code, 401);
  res = response();
  let nextCalled = false;
  const req = { headers: { authorization: 'Bearer valid-token' } };
  middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'Admin');
  jwt.verify = originalVerify;
});

test('role guard compares roles case-insensitively and denies insufficient permission', () => {
  const roleGuard = require('../middleware/roleGuard');
  const guard = roleGuard(['Admin']);
  let nextCalled = false;
  guard({ user: { role: 'admin' } }, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  const res = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  guard({ user: { role: 'Cashier' } }, res, () => assert.fail('next should not run'));
  assert.equal(res.code, 403);
  assert.equal(res.body.message, 'Access denied: insufficient permission');
});
