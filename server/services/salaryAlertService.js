const { salary_payments } = require('../models');
const { getSalaryAlertState } = require('../utils/salaryLogic');
const procurementNotificationService = require('./procurementNotificationService');

const createSalaryAlertNotification = async (record, state) => {
  if (!record || !state?.needsAlert) return null;

  const title = state.severity === 'overdue'
    ? 'Salary payment overdue'
    : state.severity === 'due_today'
      ? 'Salary payment due today'
      : 'Salary payment upcoming';

  const message = state.severity === 'overdue'
    ? `Salary payment #${record.salary_payment_id} for ${record.employee_id} is overdue by ${state.daysLate} day(s).`
    : state.severity === 'due_today'
      ? `Salary payment #${record.salary_payment_id} for ${record.employee_id} is due today.`
      : `Salary payment #${record.salary_payment_id} for ${record.employee_id} is due soon.`;

  return procurementNotificationService.createNotification(
    'SALARY_ALERT',
    title,
    message,
    'salary_payment',
    record.salary_payment_id,
    state.severity === 'overdue' ? 'critical' : 'warning'
  );
};

const syncSalaryAlertState = async (record) => {
  if (!record || record.payment_status === 'Paid') {
    return record;
  }

  const state = getSalaryAlertState(record.due_date, record.payment_status);
  const nextStatus = state.severity === 'none' ? 'none' : state.severity;
  const updateData = {
    alert_status: nextStatus,
    alert_message: state.severity === 'none' ? null : (state.severity === 'overdue' ? 'Overdue' : state.severity === 'due_today' ? 'Due today' : 'Upcoming')
  };

  await salary_payments.update(updateData, { where: { salary_payment_id: record.salary_payment_id } });
  const updated = await salary_payments.findByPk(record.salary_payment_id);
  if (state.needsAlert) {
    await createSalaryAlertNotification(updated, state);
  }
  return updated;
};

const checkAndCreatePendingAlerts = async () => {
  const pending = await salary_payments.findAll({ where: { payment_status: 'Pending' } });
  let count = 0;
  for (const record of pending) {
    const state = getSalaryAlertState(record.due_date, record.payment_status);
    if (state.needsAlert) {
      count += 1;
      await createSalaryAlertNotification(record, state);
      await salary_payments.update({
        alert_status: state.severity === 'none' ? 'none' : state.severity,
        alert_message: state.severity === 'none' ? null : (state.severity === 'overdue' ? 'Overdue' : state.severity === 'due_today' ? 'Due today' : 'Upcoming')
      }, { where: { salary_payment_id: record.salary_payment_id } });
    }
  }
  return count;
};

module.exports = {
  createSalaryAlertNotification,
  syncSalaryAlertState,
  checkAndCreatePendingAlerts
};
