const db = require('../models');

// Notification types for cheque exchange module
const NOTIF_TYPES = {
  CHEQUE_RECEIVED:    'cheque_received',
  CHEQUE_DEPOSITED:   'cheque_deposited',
  CHEQUE_DUE:         'cheque_due_clearance',
  CHEQUE_CLEARED:     'cheque_cleared',
  CHEQUE_BOUNCED:     'cheque_bounced',
  CHEQUE_CANCELLED:   'cheque_cancelled',
  REPAYMENT_REQUIRED: 'repayment_required',
  REPAYMENT_DONE:     'repayment_completed',
};

/**
 * Create a notification for the cheque exchange module.
 * Prevents duplicates by checking (cheque_id, type) for unresolved notifications.
 */
async function createChequeNotification(io, { cheque_id, customer_name, cheque_number, type, message }) {
  try {
    // Use procurement_notifications table (already exists) with a module prefix
    const existing = await db.procurement_notifications.findOne({
      where: {
        reference_id: cheque_id,
        notification_type: type,
        is_read: false,
      },
    });
    if (existing) return;

    const notif = await db.procurement_notifications.create({
      notification_type: type,
      title: buildTitle(type, cheque_number),
      message: message || buildMessage(type, customer_name, cheque_number),
      reference_id: cheque_id,
      reference_type: 'customer_cheque',
      is_read: false,
      priority: getPriority(type),
    });

    if (io) {
      io.emit('cheque_notification', {
        id: notif.notification_id || notif.id,
        type,
        title: notif.title,
        message: notif.message,
        cheque_id,
      });
    }
  } catch (e) {
    console.warn('[ChequeNotif] Failed to create notification:', e.message);
  }
}

function buildTitle(type, chequeNumber) {
  const map = {
    [NOTIF_TYPES.CHEQUE_RECEIVED]:    `New Cheque Received — #${chequeNumber}`,
    [NOTIF_TYPES.CHEQUE_DEPOSITED]:   `Cheque Deposited — #${chequeNumber}`,
    [NOTIF_TYPES.CHEQUE_DUE]:         `Cheque Due for Clearance — #${chequeNumber}`,
    [NOTIF_TYPES.CHEQUE_CLEARED]:     `Cheque Cleared — #${chequeNumber}`,
    [NOTIF_TYPES.CHEQUE_BOUNCED]:     `Cheque Bounced — #${chequeNumber}`,
    [NOTIF_TYPES.CHEQUE_CANCELLED]:   `Cheque Cancelled — #${chequeNumber}`,
    [NOTIF_TYPES.REPAYMENT_REQUIRED]: `Repayment Required — #${chequeNumber}`,
    [NOTIF_TYPES.REPAYMENT_DONE]:     `Repayment Completed — #${chequeNumber}`,
  };
  return map[type] || `Cheque Update — #${chequeNumber}`;
}

function buildMessage(type, customerName, chequeNumber) {
  const map = {
    [NOTIF_TYPES.CHEQUE_RECEIVED]:    `Cheque #${chequeNumber} received from ${customerName}. Cash paid to customer.`,
    [NOTIF_TYPES.CHEQUE_DEPOSITED]:   `Cheque #${chequeNumber} from ${customerName} has been deposited to the bank.`,
    [NOTIF_TYPES.CHEQUE_DUE]:         `Cheque #${chequeNumber} from ${customerName} is due for clearance.`,
    [NOTIF_TYPES.CHEQUE_CLEARED]:     `Cheque #${chequeNumber} from ${customerName} has been cleared by the bank.`,
    [NOTIF_TYPES.CHEQUE_BOUNCED]:     `Cheque #${chequeNumber} from ${customerName} has bounced. Repayment required.`,
    [NOTIF_TYPES.CHEQUE_CANCELLED]:   `Cheque #${chequeNumber} from ${customerName} has been cancelled.`,
    [NOTIF_TYPES.REPAYMENT_REQUIRED]: `Customer ${customerName} must repay for bounced cheque #${chequeNumber}.`,
    [NOTIF_TYPES.REPAYMENT_DONE]:     `Repayment completed by ${customerName} for cheque #${chequeNumber}.`,
  };
  return map[type] || `Update on cheque #${chequeNumber} for ${customerName}.`;
}

function getPriority(type) {
  if ([NOTIF_TYPES.CHEQUE_BOUNCED, NOTIF_TYPES.REPAYMENT_REQUIRED].includes(type)) return 'high';
  if ([NOTIF_TYPES.CHEQUE_DUE, NOTIF_TYPES.CHEQUE_DEPOSITED].includes(type)) return 'medium';
  return 'low';
}

/**
 * Check all Pending customer cheques and fire CHEQUE_DUE alerts for those
 * whose expected_clearance_date is today or within the next 7 days.
 * Also fires CHEQUE_DUE for overdue cheques (past clearance date) if not already notified.
 */
async function checkChequeDueAlerts(io) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const { Op } = require('sequelize');
    const pendingCheques = await db.customer_cheques.findAll({
      where: {
        cheque_status: 'Pending',
        expected_clearance_date: { [Op.lte]: sevenDaysLater },
      },
      include: [{ model: db.cheque_customers, as: 'customer', attributes: ['customer_name'] }],
    });

    for (const cheque of pendingCheques) {
      const clearanceDate = new Date(cheque.expected_clearance_date);
      clearanceDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((clearanceDate - today) / (1000 * 60 * 60 * 24));

      const message = daysLeft < 0
        ? `Cheque #${cheque.cheque_number} from ${cheque.customer?.customer_name || 'customer'} is overdue (was due on ${cheque.expected_clearance_date}).`
        : daysLeft === 0
          ? `Cheque #${cheque.cheque_number} from ${cheque.customer?.customer_name || 'customer'} is due for clearance today.`
          : `Cheque #${cheque.cheque_number} from ${cheque.customer?.customer_name || 'customer'} is due for clearance in ${daysLeft} day(s) (${cheque.expected_clearance_date}).`;

      await createChequeNotification(io, {
        cheque_id: cheque.cheque_id,
        customer_name: cheque.customer?.customer_name || '',
        cheque_number: cheque.cheque_number,
        type: NOTIF_TYPES.CHEQUE_DUE,
        message,
      });
    }

    return pendingCheques.length;
  } catch (e) {
    console.warn('[ChequeNotif] checkChequeDueAlerts failed:', e.message);
    return 0;
  }
}

module.exports = { createChequeNotification, checkChequeDueAlerts, NOTIF_TYPES };
