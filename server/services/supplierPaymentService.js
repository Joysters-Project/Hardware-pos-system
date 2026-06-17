const { supplier_payments, suppliers, purchase_orders } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');
const notificationService = require('./procurementNotificationService');

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
const processPayment = async (paymentId, amountPaid, paymentMethod, paidDate, notes = '') => {
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

    const newPaidAmount = parseFloat(payment.paid_amount) + parseFloat(amountPaid);
    const newBalance = parseFloat(payment.invoice_amount) - newPaidAmount;

    if (newBalance < -0.01) {
      throw new Error(`Payment amount LKR ${amountPaid} exceeds outstanding balance of LKR ${payment.balance_amount}`);
    }

    let status = 'Partially Paid';
    if (newBalance <= 0) {
      status = 'Paid';
    }

    await payment.update({
      paid_amount: newPaidAmount,
      balance_amount: Math.max(0, newBalance),
      payment_status: status,
      payment_method: paymentMethod,
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      notes: notes || payment.notes
    });

    // Create Notification
    await notificationService.createNotification(
      'PAYMENT_RECORDED',
      `Payment Processed for Invoice ${payment.invoice_number}`,
      `Successfully processed payment of LKR ${parseFloat(amountPaid).toLocaleString()} for ${payment.supplier?.supplier_name || 'supplier'}. Remaining balance: LKR ${Math.max(0, newBalance).toLocaleString()}.`,
      'payment',
      payment.payment_id,
      'info'
    );

    // Send Receipt Email (async)
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
  checkAndMarkOverdue
};
