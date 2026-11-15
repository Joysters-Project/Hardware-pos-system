const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { bill: null, payments: [] };
const db = {
  sequelize: {
    transaction: async (callback) => callback({})
  },
  bills: {
    findByPk: async (billId) => {
      if (!state.bill || state.bill.bill_id !== Number(billId)) return null;
      return {
        ...state.bill,
        async update(values) {
          Object.assign(state.bill, values);
          Object.assign(this, values);
        }
      };
    }
  },
  payments: {
    sum: async (_field, { where }) => state.payments
      .filter((payment) => payment.bill_id === where.bill_id)
      .reduce((total, payment) => total + Number(payment.amount_paid), 0),
    create: async (values) => {
      const payment = { payment_id: state.payments.length + 1, ...values };
      state.payments.push(payment);
      return payment;
    }
  }
};

const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === '../models' && /server[\\/]services[\\/]dueCollectionService\.js$/.test(parent.filename)) {
    return db;
  }
  return originalLoad.call(this, request, parent, ...args);
};

let dueCollectionService;
try {
  dueCollectionService = require('../services/dueCollectionService');
} finally {
  Module._load = originalLoad;
}

test('partial payments recalculate balance from payment history and mark fully paid bills', async () => {
  state.bill = {
    bill_id: 7,
    total_amount: '2500.00',
    balance_due: '1750.00',
    status: 'PARTIAL',
    expected_payment_date: '2026-11-15'
  };
  state.payments = [{ payment_id: 1, bill_id: 7, amount_paid: '500.00' }];

  const firstPayment = await dueCollectionService.collectPayment({
    bill_id: 7,
    amount_paid: 1000,
    payment_method: 'CASH'
  }, 4);

  assert.equal(firstPayment.balanceRemaining, 1000);
  assert.equal(state.bill.balance_due, 1000);
  assert.equal(state.bill.status, 'PARTIAL');
  assert.equal(state.payments.length, 2);

  const finalPayment = await dueCollectionService.collectPayment({
    bill_id: 7,
    amount_paid: 1000,
    payment_method: 'CASH'
  }, 4);

  assert.equal(finalPayment.balanceRemaining, 0);
  assert.equal(state.bill.balance_due, 0);
  assert.equal(state.bill.status, 'PAID');
  assert.equal(state.bill.expected_payment_date, null);
  assert.equal(state.payments.length, 3);

  await assert.rejects(
    dueCollectionService.collectPayment({ bill_id: 7, amount_paid: 1 }, 4),
    /already been fully paid/
  );
  assert.equal(state.payments.length, 3);
});
