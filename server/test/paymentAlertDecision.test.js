const assert = require('node:assert/strict');
const {
  resolvePaymentAlertAction,
  canMarkChequeCleared,
} = require('../utils/paymentAlertDecision');

const cases = [
  {
    label: 'due today cheque -> mark cleared',
    payment: { payment_method: 'Cheque', payment_status: 'Pending', cheque_status: 'Pending', alert_type: 'Due Today' },
    expectedAction: 'mark-cleared',
    expectedAllowed: true,
  },
  {
    label: 'overdue cheque -> mark cleared',
    payment: { payment_method: 'Cheque', payment_status: 'Pending', cheque_status: 'Pending', alert_type: 'Overdue' },
    expectedAction: 'mark-cleared',
    expectedAllowed: true,
  },
  {
    label: 'bounced cheque -> resolve bounced',
    payment: { payment_method: 'Cheque', payment_status: 'Unpaid', cheque_status: 'Bounced', alert_type: 'Bounced' },
    expectedAction: 'resolve-bounced',
    expectedAllowed: false,
  },
  {
    label: 'already paid cheque -> view only',
    payment: { payment_method: 'Cheque', payment_status: 'Paid', cheque_status: 'Cleared', alert_type: 'Due Today' },
    expectedAction: 'view-only',
    expectedAllowed: false,
  },
  {
    label: 'cash pending -> confirm payment',
    payment: { payment_method: 'Cash', payment_status: 'Pending', cheque_status: null, alert_type: 'Due Today' },
    expectedAction: 'confirm-payment',
    expectedAllowed: false,
  },
];

for (const testCase of cases) {
  const action = resolvePaymentAlertAction(testCase.payment);
  assert.equal(action, testCase.expectedAction, `${testCase.label}: action mismatch`);
  assert.equal(canMarkChequeCleared(testCase.payment), testCase.expectedAllowed, `${testCase.label}: clearance validation mismatch`);
}

console.log('payment alert decision tests passed');
