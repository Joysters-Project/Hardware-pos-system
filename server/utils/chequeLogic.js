// Configurable clearing days — change this value to adjust globally
const CHEQUE_CLEARING_DAYS = 3;

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

const calculatePendingChequeDate = (chequeDate, daysToAdd = CHEQUE_CLEARING_DAYS) => {
  if (!chequeDate) return null;
  const d = new Date(chequeDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(daysToAdd || 3));
  return formatDate(d);
};

const normalizeChequeDetails = (input = {}, paymentMethod) => {
  const method = (paymentMethod || input.payment_method || '').toString().toLowerCase();
  const isCheque = method === 'cheque';

  return {
    cheque_number: isCheque ? (input.cheque_number || null) : null,
    bank_name: isCheque ? (input.bank_name || null) : null,
    cheque_date: isCheque ? (input.cheque_date || null) : null,
    pending_cheque_date: isCheque
      ? (input.pending_cheque_date || calculatePendingChequeDate(input.cheque_date, input.pending_days || CHEQUE_CLEARING_DAYS) || null)
      : null,
    cheque_status: isCheque ? (input.cheque_status || 'Pending') : null,
    pending_days: input.pending_days || CHEQUE_CLEARING_DAYS
  };
};

module.exports = {
  CHEQUE_CLEARING_DAYS,
  calculatePendingChequeDate,
  normalizeChequeDetails
};
