const { supplier_payments, suppliers, purchase_orders } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');
const notificationService = require('./procurementNotificationService');
const { normalizeChequeDetails, calculatePendingChequeDate } = require('../utils/chequeLogic');

/**
 * createPaymentRecord
 * Auto-creates a pending payment record when a PO is created/received.
 */
const createPaymentRecord = async (poId, supplierId, invoiceNumber, invoiceAmount, dueDate) => {
  try {
    const existing = await supplier_payments.findOne({ where: { po_id: poId } });
    if (existing) return existing;

    return await supplier_payments.create({
      supplier_id: supplierId,
      po_id: poId,
      invoice_number: invoiceNumber || `INV-PO-${poId}`,
      invoice_amount: invoiceAmount,
      paid_amount: 0.00,
      balance_amount: invoiceAmount,
      due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 30 days
      payment_status: 'Pending'
    });
  } catch (err) {
    console.error(`[SupplierPaymentService] Error creating payment record: ${err.message}`);
    throw err;
  }
};

/**
 * processPayment
 * Record a payment against an invoice (paying down outstanding balance).
 */
const processPayment = async (paymentId, amountPaid, paymentMethod, paidDate, notes = '', chequeDetails = {}) => {
  try {
    const payment = await supplier_payments.findByPk(paymentId, {
      include: [
        { model: suppliers },
        { model: purchase_orders }
      ]
    });

    if (!payment) {
      throw new Error(`Payment record with ID ${paymentId} not found`);
    }

    const normalizedCheque = normalizeChequeDetails(chequeDetails, paymentMethod);
    const newPaidAmount = parseFloat(payment.paid_amount) + parseFloat(amountPaid);
    const newBalance = parseFloat(payment.invoice_amount) - newPaidAmount;

    if (newBalance < -0.01) {
      throw new Error(`Payment amount LKR ${amountPaid} exceeds outstanding balance of LKR ${payment.balance_amount}`);
    }

    let status = 'Partially Paid';
    if (newBalance <= 0) {
      status = 'Paid';
    }

    const isChequePayment = (paymentMethod || payment.payment_method || '').toString().toLowerCase() === 'cheque';
    const updateData = {
      paid_amount: newPaidAmount,
      balance_amount: Math.max(0, newBalance),
      payment_status: status,
      payment_method: paymentMethod || payment.payment_method,
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      notes: notes || payment.notes
    };

    if (isChequePayment) {
      const pendingDate = normalizedCheque.pending_cheque_date ||
        calculatePendingChequeDate(normalizedCheque.cheque_date, normalizedCheque.pending_days) ||
        payment.pending_cheque_date;

      Object.assign(updateData, {
        cheque_number: normalizedCheque.cheque_number ?? payment.cheque_number ?? null,
        bank_name: normalizedCheque.bank_name ?? payment.bank_name ?? null,
        cheque_date: normalizedCheque.cheque_date ?? payment.cheque_date ?? null,
        pending_cheque_date: pendingDate,
        cheque_status: normalizedCheque.cheque_status || payment.cheque_status || 'Pending'
      });
    } else {
      Object.assign(updateData, {
        cheque_number: null,
        bank_name: null,
        cheque_date: null,
        pending_cheque_date: null,
        cheque_status: null
      });
    }

    await payment.update(updateData);

    if (isChequePayment) {
      await notificationService.createNotification(
        'CHEQUE_PAYMENT_RECORDED',
        'Cheque payment recorded',
        `Cheque ${updateData.cheque_number || payment.payment_id} was recorded for ${payment.supplier?.supplier_name || 'supplier'}.`,
        'payment',
        payment.payment_id,
        'info'
      );
    }

    await notificationService.createNotification(
      'PAYMENT_RECORDED',
      'Payment Processed',
      `Successfully processed payment of LKR ${parseFloat(amountPaid).toLocaleString()} for ${payment.supplier?.supplier_name || 'supplier'}. Remaining balance: LKR ${Math.max(0, newBalance).toLocaleString()}.`,
      'payment',
      payment.payment_id,
      'info'
    );

    if (payment.supplier?.email) {
      emailService.sendPaymentReceiptEmail(payment).catch(err => {
        console.error(`[SupplierPaymentService] Failed to send receipt email: ${err.message}`);
      });
    }

    return payment;
  } catch (err) {
    console.error(`[SupplierPaymentService] Error processing payment: ${err.message}`);
    throw err;
  }
};

/**
 * getOutstandingPayables
 */
const getOutstandingPayables = async () => {
  try {
    return await supplier_payments.findAll({
      where: {
        payment_status: { [Op.in]: ['Pending', 'Partially Paid', 'Overdue'] }
      },
      include: [suppliers, purchase_orders],
      order: [['due_date', 'ASC']]
    });
  } catch (err) {
    console.error(`[SupplierPaymentService] Error getting outstanding payables: ${err.message}`);
    throw err;
  }
};

/**
 * getPaymentsDueThisWeek
 */
const getPaymentsDueThisWeek = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return await supplier_payments.findAll({
      where: {
        payment_status: { [Op.in]: ['Pending', 'Partially Paid', 'Overdue'] },
        due_date: {
          [Op.between]: [today, sevenDaysLater]
        }
      },
      include: [suppliers],
      order: [['due_date', 'ASC']]
    });
  } catch (err) {
    console.error(`[SupplierPaymentService] Error getting payments due this week: ${err.message}`);
    throw err;
  }
};

const checkAndAlertPendingCheques = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pendingCheques = await supplier_payments.findAll({
      where: {
        payment_method: 'Cheque',
        cheque_status: { [Op.in]: ['Pending', 'Pending Review'] }
      },
      include: [suppliers]
    });

    for (const payment of pendingCheques) {
      if (!payment.pending_cheque_date) continue;

      if (payment.pending_cheque_date < today) {
        await payment.update({ cheque_status: 'Pending Review' });

        await notificationService.createNotification(
          'CHEQUE_OVERDUE',
          'Cheque pending beyond expected date',
          `Cheque ${payment.cheque_number || payment.payment_id} for ${payment.supplier?.supplier_name || 'supplier'} is still pending after ${payment.pending_cheque_date}.`,
          'payment',
          payment.payment_id,
          'warning'
        );
      }
    }

    return pendingCheques.length;
  } catch (err) {
    console.error(`[SupplierPaymentService] Error checking pending cheques: ${err.message}`);
    throw err;
  }
};

/**
 * checkAndMarkOverdue
 * Daily cron job to scan outstanding invoices past due date and mark as Overdue.
 */
const checkAndMarkOverdue = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = await supplier_payments.findAll({
      where: {
        payment_status: { [Op.in]: ['Pending', 'Partially Paid'] },
        due_date: { [Op.lt]: today }
      },
      include: [suppliers]
    });

    for (const payment of overdueInvoices) {
      await payment.update({ payment_status: 'Overdue' });

      // Create Notification
      await notificationService.createNotification(
        'PAYMENT_OVERDUE',
        `Invoice ${payment.invoice_number} is Overdue`,
        `Invoice amount LKR ${Number(payment.invoice_amount).toLocaleString()} from ${payment.supplier?.supplier_name} was due on ${payment.due_date}. Balance outstanding: LKR ${Number(payment.balance_amount).toLocaleString()}`,
        'payment',
        payment.payment_id,
        'critical'
      );

      // Send Reminder Email (async)
      if (payment.supplier?.email) {
        emailService.sendPaymentOverdueEmail(payment).catch(err => {
          console.error(`[SupplierPaymentService] Failed to send overdue reminder: ${err.message}`);
        });
      }
    }

    return overdueInvoices.length;
  } catch (err) {
    console.error(`[SupplierPaymentService] Error checking overdue invoices: ${err.message}`);
    throw err;
  }
};

module.exports = {
  createPaymentRecord,
  processPayment,
  getOutstandingPayables,
  getPaymentsDueThisWeek,
  checkAndMarkOverdue,
  checkAndAlertPendingCheques
};
