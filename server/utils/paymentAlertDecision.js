function getChequeAwaitingClearance(payment) {
  if (!payment || payment.payment_method !== 'Cheque') return false;

  const chequeStatus = String(payment.cheque_status || '').trim();
  const paymentStatus = String(payment.payment_status || '').trim();

  if (chequeStatus === 'Bounced' || chequeStatus === 'Cancelled') return false;
  if (paymentStatus === 'Paid' || chequeStatus === 'Cleared') return false;

  return chequeStatus === 'Pending' || chequeStatus === '' || chequeStatus === null || chequeStatus === undefined;
}

function resolvePaymentAlertAction(payment) {
  if (!payment) return 'view-only';

  const paymentMethod = String(payment.payment_method || '').trim();
  const paymentStatus = String(payment.payment_status || '').trim();
  const chequeStatus = String(payment.cheque_status || '').trim();
  const alertStatus = String(payment.alert_status || '').trim();

  if (alertStatus === 'Resolved' || alertStatus === 'Closed' || alertStatus === 'Completed') {
    return 'view-only';
  }

  if (paymentMethod === 'Cheque') {
    if (chequeStatus === 'Bounced') return 'resolve-bounced';
    if (paymentStatus === 'Paid' || chequeStatus === 'Cleared') return 'view-only';
    if (getChequeAwaitingClearance(payment)) return 'mark-cleared';
    return 'view-only';
  }

  if (paymentStatus === 'Paid' || paymentStatus === 'Completed') return 'view-only';
  if (paymentStatus === 'Pending Confirmation') return 'confirm-payment';
  if (paymentStatus === 'Pending') return 'confirm-payment';
  if (paymentStatus === 'Partially Paid') return 'confirm-payment';
  return 'view-only';
}

function canMarkChequeCleared(payment) {
  if (!payment || String(payment.payment_method || '').trim() !== 'Cheque') return false;
  if (String(payment.payment_status || '').trim() === 'Paid') return false;
  if (String(payment.cheque_status || '').trim() === 'Cleared') return false;
  if (String(payment.cheque_status || '').trim() === 'Bounced') return false;
  if (String(payment.cheque_status || '').trim() === 'Cancelled') return false;
  return getChequeAwaitingClearance(payment);
}

module.exports = {
  resolvePaymentAlertAction,
  canMarkChequeCleared,
  getChequeAwaitingClearance,
};
