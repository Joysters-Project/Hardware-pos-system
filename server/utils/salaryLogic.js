const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    if (Number.isNaN(localDate.getTime())) return null;
    return localDate;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildSalaryPeriod = (frequency = 'monthly', referenceDate = null) => {
  const baseDate = parseDate(referenceDate) || new Date();
  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);

  if (frequency === 'daily') {
    return {
      payment_frequency: 'daily',
      pay_period_start_date: toDateString(startOfDay),
      pay_period_end_date: toDateString(startOfDay),
      due_date: toDateString(startOfDay),
      alert_due_date: toDateString(startOfDay)
    };
  }

  if (frequency === 'weekly') {
    const start = new Date(startOfDay);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      payment_frequency: 'weekly',
      pay_period_start_date: toDateString(start),
      pay_period_end_date: toDateString(end),
      due_date: toDateString(end),
      alert_due_date: toDateString(end)
    };
  }

  if (frequency === 'work_based') {
    const start = new Date(startOfDay);
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 6);
    return {
      payment_frequency: 'work_based',
      pay_period_start_date: toDateString(start),
      pay_period_end_date: toDateString(end),
      due_date: toDateString(end),
      alert_due_date: toDateString(end)
    };
  }

  const monthStart = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const monthEnd = new Date(startOfDay.getFullYear(), startOfDay.getMonth() + 1, 0);
  return {
    payment_frequency: 'monthly',
    pay_period_start_date: toDateString(monthStart),
    pay_period_end_date: toDateString(monthEnd),
    due_date: toDateString(monthEnd),
    alert_due_date: toDateString(monthEnd)
  };
};

const getSalaryAlertState = (dueDate, paymentStatus) => {
  const due = parseDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!due) {
    return { needsAlert: false, severity: 'none', daysLate: 0 };
  }

  const diffDays = Math.floor((today - due) / DAY_MS);
  if (paymentStatus === 'Paid') {
    return { needsAlert: false, severity: 'none', daysLate: 0 };
  }

  if (diffDays >= 1) {
    return { needsAlert: true, severity: 'overdue', daysLate: Math.max(1, diffDays) };
  }

  if (diffDays === 0) {
    return { needsAlert: true, severity: 'due_today', daysLate: 0 };
  }

  if (diffDays <= -3) {
    return { needsAlert: true, severity: 'upcoming', daysLate: 0 };
  }

  return { needsAlert: false, severity: 'none', daysLate: 0 };
};

module.exports = {
  buildSalaryPeriod,
  getSalaryAlertState
};
