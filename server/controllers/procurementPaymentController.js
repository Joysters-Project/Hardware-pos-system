const { supplier_payments, suppliers, purchase_orders } = require('../models');
const paymentService = require('../services/supplierPaymentService');
const pdfService = require('../services/pdfService');
const notificationService = require('../services/procurementNotificationService');
const { fn, col, literal } = require('sequelize');
const { CHEQUE_CLEARING_DAYS } = require('../utils/chequeLogic');
const { canMarkChequeCleared } = require('../utils/paymentAlertDecision');
const { formatPurchaseOrderNumber } = require('../utils/purchaseOrderNumber');

const serializePayment = (payment) => {
  const data = payment.toJSON ? payment.toJSON() : { ...payment };
  if (data.purchase_order) {
    data.purchase_order.po_number = formatPurchaseOrderNumber(data.purchase_order.po_number, data.po_id);
  }
  return data;
};

/**
 * recordPayment
 * POST /api/procurement/payments
 */
exports.recordPayment = async (req, res) => {
  try {
    console.log('[recordPayment] payload:', JSON.stringify(req.body));
    const {
      payment_id,
      paid_amount,
      payment_method,
      paid_date,
      notes,
      cheque_number,
      bank_name,
      cheque_date,
      clearing_date,
      pending_cheque_date,
      cheque_status,
      pending_days
    } = req.body;

    if (!payment_id || paid_amount === undefined || paid_amount === null || isNaN(parseFloat(paid_amount)) || parseFloat(paid_amount) <= 0) {
      return res.status(400).json({ error: 'payment_id and paid_amount (> 0) are required' });
    }

    const updated = await paymentService.processPayment(
      payment_id,
      paid_amount,
      payment_method,
      paid_date,
      notes,
      {
        cheque_number,
        bank_name,
        cheque_date,
        clearing_date,
        pending_cheque_date,
        cheque_status,
        pending_days
      }
    );

    res.json({ message: 'Payment recorded successfully', payment: updated });
  } catch (error) {
    console.error('[recordPayment] error:', error);
    const msg = (error && error.message) ? error.message : 'Internal server error';
    if (/not found|exceeds outstanding|required/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    // Return stack in non-production for debugging
    const payload = { error: msg };
    if (process.env.NODE_ENV !== 'production' && error.stack) payload.stack = error.stack;
    res.status(500).json(payload);
  }
};

/**
 * getAllPayments
 * GET /api/procurement/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { status, supplier_id, start_date, end_date, cheque_status, payment_method } = req.query;
    const whereClause = {};

    if (status)          whereClause.payment_status  = status;
    if (supplier_id)     whereClause.supplier_id     = supplier_id;
    if (payment_method)  whereClause.payment_method  = payment_method;
    if (cheque_status)   whereClause.cheque_status   = cheque_status;
    if (start_date && end_date) {
      const { Op } = require('sequelize');
      whereClause.due_date = { [Op.between]: [start_date, end_date] };
    }

    const list = await supplier_payments.findAll({
      where: whereClause,
      include: [
        { model: suppliers, attributes: ['supplier_name', 'supplier_code'] },
        { model: purchase_orders, attributes: ['po_number'] }
      ],
      order: [['due_date', 'ASC']]
    });

    res.json(list.map(serializePayment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getPaymentById
 * GET /api/procurement/payments/:id
 */
exports.getPaymentById = async (req, res) => {
  try {
    const item = await supplier_payments.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: purchase_orders }
      ]
    });

    if (!item) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    res.json(serializePayment(item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getSupplierPayments
 * GET /api/procurement/payments/supplier/:id
 */
exports.getSupplierPayments = async (req, res) => {
  try {
    const list = await supplier_payments.findAll({
      where: { supplier_id: req.params.id },
      include: [
        { model: purchase_orders, attributes: ['po_number'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(list.map(serializePayment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getPaymentDashboard
 * GET /api/procurement/payments/dashboard
 */
exports.getPaymentDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const nearDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { Op } = require('sequelize');
    const allInvoices = await supplier_payments.findAll({
      where: { payment_status: { [Op.ne]: 'Cancelled' } },
      include: [{ model: suppliers, attributes: ['supplier_name'] }]
    });

    let outstanding = 0, dueToday = 0, dueThisWeek = 0, overdue = 0, paidThisMonth = 0;
    let agingCurrent = 0, aging0_30 = 0, aging31_60 = 0, aging61_90 = 0, aging90Plus = 0;
    const chequeSummary = { Pending: 0, Cleared: 0, Bounced: 0, Cancelled: 0 };
    const pendingChequeAlerts = [];

    allInvoices.forEach(inv => {
      const balance  = parseFloat(inv.balance_amount);
      const paid     = parseFloat(inv.paid_amount);
      const dueDate  = inv.due_date;
      const paidDate = inv.paid_date;

      if (inv.payment_status !== 'Paid') {
        outstanding += balance;
        if (dueDate === today)                          dueToday   += balance;
        if (dueDate >= today && dueDate <= sevenDaysLater) dueThisWeek += balance;
        if (dueDate < today)                            overdue    += balance;

        const diffDays = Math.ceil((new Date(today) - new Date(dueDate)) / (1000 * 60 * 60 * 24));
        if      (diffDays <= 0)  agingCurrent += balance;
        else if (diffDays <= 30) aging0_30    += balance;
        else if (diffDays <= 60) aging31_60   += balance;
        else if (diffDays <= 90) aging61_90   += balance;
        else                     aging90Plus  += balance;
      }
      if (paidDate && paidDate >= currentMonthStart) paidThisMonth += paid;

      if (inv.payment_method === 'Cheque' && inv.cheque_status) {
        const cs = inv.cheque_status;
        if (cs in chequeSummary) chequeSummary[cs]++;
      }

      if (
        inv.payment_method === 'Cheque' &&
        inv.cheque_status === 'Pending' &&
        inv.pending_cheque_date
      ) {
        const isOverdue    = inv.pending_cheque_date < today;
        const isNearDue    = !isOverdue && inv.pending_cheque_date <= nearDueDate;
        if (isOverdue || isNearDue) {
          const msLeft     = new Date(inv.pending_cheque_date) - new Date(today);
          const daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
          pendingChequeAlerts.push({
            payment_id:          inv.payment_id,
            supplier_name:       inv.supplier?.supplier_name || '—',
            cheque_number:       inv.cheque_number,
            cheque_date:         inv.cheque_date,
            pending_cheque_date: inv.pending_cheque_date,
            days_remaining:      daysRemaining,
            is_overdue:          isOverdue
          });
        }
      }
    });

    pendingChequeAlerts.sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      return new Date(a.pending_cheque_date) - new Date(b.pending_cheque_date);
    });

    res.json({
      summary: { outstanding, dueToday, dueThisWeek, overdue, paidThisMonth },
      aging: [
        { range: 'Current',            amount: agingCurrent },
        { range: '1-30 Days Overdue',  amount: aging0_30    },
        { range: '31-60 Days Overdue', amount: aging31_60   },
        { range: '61-90 Days Overdue', amount: aging61_90   },
        { range: '90+ Days Overdue',   amount: aging90Plus  }
      ],
      chequeSummary,
      pendingChequeAlerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * updateChequeStatus
 * PATCH /api/procurement/payments/:id/cheque-status
 */
exports.updateChequeStatus = async (req, res) => {
  const transaction = await supplier_payments.sequelize.transaction();
  try {
    const { cheque_status } = req.body;
    const VALID = ['Pending', 'Cleared', 'Bounced', 'Cancelled'];
    if (!VALID.includes(cheque_status)) {
      await transaction.rollback();
      return res.status(400).json({ error: `cheque_status must be one of: ${VALID.join(', ')}` });
    }

    const payment = await supplier_payments.findByPk(req.params.id, {
      include: [{ model: suppliers, attributes: ['supplier_name'] }],
      transaction,
    });
    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Payment record not found' });
    }
    if (payment.payment_method !== 'Cheque') {
      await transaction.rollback();
      return res.status(400).json({ error: 'This payment is not a cheque payment' });
    }

    const prev = payment.cheque_status;

    if (cheque_status === 'Cleared') {
      if (!canMarkChequeCleared(payment)) {
        await transaction.rollback();
        if (payment.payment_status === 'Paid' || payment.cheque_status === 'Cleared') {
          return res.status(409).json({ error: 'This payment is already completed and cannot be marked as cleared again.' });
        }
        if (payment.cheque_status === 'Bounced') {
          return res.status(409).json({ error: 'A bounced cheque cannot be marked as cleared directly.' });
        }
        return res.status(409).json({ error: 'This cheque is not eligible to be marked as cleared.' });
      }
    }

    if (cheque_status === 'Bounced' && payment.cheque_status === 'Bounced') {
      await transaction.rollback();
      return res.status(409).json({ error: 'This bounced cheque is already resolved as bounced.' });
    }

    const totalAmount  = parseFloat(payment.invoice_amount || 0);
    const paidAmount   = parseFloat(payment.paid_amount    || 0);
    const balance      = parseFloat(payment.balance_amount || 0);

    const updateFields = { cheque_status };
    if (cheque_status === 'Cleared') {
      updateFields.payment_status = balance <= 0 ? 'Paid' : 'Partial';
    } else if (cheque_status === 'Bounced' || cheque_status === 'Cancelled') {
      updateFields.payment_status = 'Unpaid';
      updateFields.paid_amount    = 0;
      updateFields.balance_amount = totalAmount;
    }

    await payment.update(updateFields, { transaction });
    await transaction.commit();

    // Notify all connected clients so Alert Center / bell refresh immediately
    const io = req.app.get('io');
    if (io) io.emit('cheque:alerts:updated');

    const chequeRef = payment.cheque_number || `PAY-${payment.payment_id}`;
    const supplierName = payment.supplier?.supplier_name || 'supplier';
    const notifMap = {
      Cleared:   { title: 'Cheque Cleared',   msg: `Cheque ${chequeRef} has been cleared successfully.`,                          severity: 'success'  },
      Bounced:   { title: 'Cheque Bounced',   msg: `Cheque ${chequeRef} has bounced. Please follow up with ${supplierName}.`,     severity: 'critical' },
      Cancelled: { title: 'Cheque Cancelled', msg: `Cheque ${chequeRef} for ${supplierName} has been cancelled.`,                 severity: 'warning'  },
    };
    if (notifMap[cheque_status] && prev !== cheque_status) {
      const n = notifMap[cheque_status];
      await notificationService.createNotification(
        `CHEQUE_${cheque_status.toUpperCase()}`, n.title, n.msg, 'payment', payment.payment_id, n.severity
      );
    }

    res.json({ message: `Cheque status updated to ${cheque_status}`, payment: { ...payment.toJSON(), ...updateFields } });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

/**
 * getChequeAlerts
 * GET /api/procurement/payments/cheque-alerts
 * Returns active cheque alerts based on clearing date (pending_cheque_date) and cheque_status
 */
exports.getChequeAlerts = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all cheque payments that are Pending or Bounced
    const rows = await supplier_payments.findAll({
      where: {
        payment_method: 'Cheque',
        payment_status: { [Op.ne]: 'Paid' },
        cheque_status: { [Op.in]: ['Pending', 'Bounced'] },
      },
      include: [
        { model: suppliers, attributes: ['supplier_name'] },
        { model: purchase_orders, attributes: ['po_number'] },
      ],
      order: [['pending_cheque_date', 'ASC']],
    });

    const DUE_SOON_DAYS = 3;
    const alerts = [];

    for (const row of rows) {
      const cs = row.cheque_status;

      // Bounced — always an active alert regardless of date
      if (cs === 'Bounced') {
        const originalAmount = Number(row.invoice_amount ?? row.balance_amount ?? row.paid_amount ?? 0);
        alerts.push({
          payment_id:          row.payment_id,
          payment_method:      row.payment_method,
          payment_status:      row.payment_status,
          cheque_status:       cs,
          alert_status:        row.alert_status || null,
          supplier_name:       row.supplier?.supplier_name || '—',
          cheque_number:       row.cheque_number,
          bank_name:           row.bank_name,
          cheque_date:         row.cheque_date,
          clearing_date:       row.pending_cheque_date,
          amount:              originalAmount,
          invoice_amount:      row.invoice_amount,
          balance_amount:      row.balance_amount,
          alert_type:          'Bounced',
          days_remaining:      null,
          po_number:           formatPurchaseOrderNumber(row.purchase_order?.po_number, row.po_id) || null,
        });
        continue;
      }

      // Pending — classify by clearing date
      if (cs === 'Pending' && row.pending_cheque_date) {
        const clearingDate = new Date(row.pending_cheque_date); clearingDate.setHours(0, 0, 0, 0);
        const diffMs   = clearingDate - today;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alert_type;
        if (diffDays < 0)       alert_type = 'Overdue';
        else if (diffDays === 0) alert_type = 'Due Today';
        else if (diffDays <= DUE_SOON_DAYS) alert_type = 'Due Soon';
        else continue; // not yet alertable

        const originalAmount = Number(row.invoice_amount ?? row.balance_amount ?? row.paid_amount ?? 0);
        alerts.push({
          payment_id:    row.payment_id,
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          cheque_status: cs,
          alert_status: row.alert_status || null,
          supplier_name: row.supplier?.supplier_name || '—',
          cheque_number: row.cheque_number,
          bank_name:     row.bank_name,
          cheque_date:   row.cheque_date,
          clearing_date: row.pending_cheque_date,
          amount:        originalAmount,
          invoice_amount: row.invoice_amount,
          balance_amount: row.balance_amount,
          alert_type,
          days_remaining: diffDays,
          po_number:     formatPurchaseOrderNumber(row.purchase_order?.po_number, row.po_id) || null,
        });
      }
    }

    // Summary counts
    const summary = {
      dueSoon:  alerts.filter(a => a.alert_type === 'Due Soon').length,
      dueToday: alerts.filter(a => a.alert_type === 'Due Today').length,
      overdue:  alerts.filter(a => a.alert_type === 'Overdue').length,
      bounced:  alerts.filter(a => a.alert_type === 'Bounced').length,
      total:    alerts.length,
    };

    res.json({ alerts, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.downloadPaymentReceipt = async (req, res) => {
  try {
    const payment = await supplier_payments.findByPk(req.params.id, {
      include: [
        { model: suppliers },
        { model: purchase_orders }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const pdfBuffer = await pdfService.generatePaymentReceiptPDF(payment);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_PAY-${payment.payment_id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
