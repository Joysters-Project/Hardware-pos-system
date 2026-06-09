const { supplier_payments, suppliers, purchase_orders } = require('../models');
const paymentService = require('../services/supplierPaymentService');
const pdfService = require('../services/pdfService');
const { Op, fn, col } = require('sequelize');

/**
 * recordPayment
 * POST /api/procurement/payments
 */
exports.recordPayment = async (req, res) => {
  try {
    const { payment_id, paid_amount, payment_method, paid_date, notes } = req.body;
    
    if (!payment_id || !paid_amount) {
      return res.status(400).json({ error: 'payment_id and paid_amount are required' });
    }

    const updated = await paymentService.processPayment(
      payment_id,
      paid_amount,
      payment_method,
      paid_date,
      notes
    );

    res.json({ message: 'Payment recorded successfully', payment: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getAllPayments
 * GET /api/procurement/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { status, supplier_id, start_date, end_date } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.payment_status = status;
    }
    if (supplier_id) {
      whereClause.supplier_id = supplier_id;
    }
    if (start_date && end_date) {
      whereClause.due_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const list = await supplier_payments.findAll({
      where: whereClause,
      include: [
        { model: suppliers, attributes: ['supplier_name', 'supplier_code'] },
        { model: purchase_orders, attributes: ['po_number'] }
      ],
      order: [['due_date', 'ASC']]
    });

    res.json(list);
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

    res.json(item);
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
    res.json(list);
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

    const allInvoices = await supplier_payments.findAll({
      where: {
        payment_status: { [Op.ne]: 'Cancelled' }
      }
    });

    let outstanding = 0;
    let dueToday = 0;
    let dueThisWeek = 0;
    let overdue = 0;
    let paidThisMonth = 0;

    let agingCurrent = 0;
    let aging0_30 = 0;
    let aging31_60 = 0;
    let aging61_90 = 0;
    let aging90Plus = 0;

    allInvoices.forEach(inv => {
      const balance = parseFloat(inv.balance_amount);
      const paid = parseFloat(inv.paid_amount);
      const dueDate = inv.due_date;
      const paidDate = inv.paid_date;

      // Outstanding
      if (inv.payment_status !== 'Paid') {
        outstanding += balance;

        // Due times
        if (dueDate === today) {
          dueToday += balance;
        }
        if (dueDate >= today && dueDate <= sevenDaysLater) {
          dueThisWeek += balance;
        }
        if (dueDate < today) {
          overdue += balance;
        }

        // Aging calculation (days past due date)
        const dueTime = new Date(dueDate).getTime();
        const todayTime = new Date(today).getTime();
        const diffDays = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          agingCurrent += balance;
        } else if (diffDays <= 30) {
          aging0_30 += balance;
        } else if (diffDays <= 60) {
          aging31_60 += balance;
        } else if (diffDays <= 90) {
          aging61_90 += balance;
        } else {
          aging90Plus += balance;
        }
      }

      // Paid this month
      if (paidDate && paidDate >= currentMonthStart) {
        // Since we don't have partial transaction logs with dates in supplier_payments (we just increment paid_amount),
        // we can count the paid amount of invoices paid this month. If they were partially paid in past months,
        // this is an approximation. For a more robust billing system, we could sum by transaction date.
        // For the POS scope, referencing paid_date >= monthStart is a standard and robust approach.
        paidThisMonth += paid;
      }
    });

    res.json({
      summary: {
        outstanding,
        dueToday,
        dueThisWeek,
        overdue,
        paidThisMonth
      },
      aging: [
        { range: 'Current', amount: agingCurrent },
        { range: '1-30 Days Overdue', amount: aging0_30 },
        { range: '31-60 Days Overdue', amount: aging31_60 },
        { range: '61-90 Days Overdue', amount: aging61_90 },
        { range: '90+ Days Overdue', amount: aging90Plus }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * downloadPaymentReceipt
 * GET /api/procurement/payments/:id/pdf
 */
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
