const { suppliers, purchase_orders, supplier_payments } = require('../models');
const { fn, col, Op } = require('sequelize');
const { logActivity } = require('../services/auditService');
const pdfService = require('../services/pdfService');

// ── helpers ─────────────────────────────────────────────────────────────────
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

// POST /api/procurement/suppliers
exports.createSupplier = async (req, res) => {
  try {
    const maxId = (await suppliers.max('supplier_id')) || 0;
    const supplierCode = 'SUP-' + String(maxId + 1).padStart(3, '0');

    const supplier = await suppliers.create({
      ...req.body,
      supplier_code: supplierCode,
      status: req.body.status || 'Active',
    });

    await logActivity(
      req.user?.user_id, req.user?.role,
      'CREATE_SUPPLIER',
      `Created supplier ${supplier.supplier_code} — ${supplier.supplier_name}`,
      getIp(req)
    );

    res.status(201).json({ message: 'Supplier created successfully', data: supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const supplierList = await suppliers.findAll({
      order: [['supplier_name', 'ASC']],
      attributes: {
        include: [[fn('COUNT', col('purchase_orders.po_id')), 'po_count']],
      },
      include: [{ model: purchase_orders, attributes: [] }],
      group: ['suppliers.supplier_id'],
    });

    res.status(200).json(supplierList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/procurement/suppliers/:id
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id, {
      include: [
        { model: purchase_orders, order: [['po_date', 'DESC']] },
        { model: supplier_payments, order: [['due_date', 'DESC']] }
      ],
    });

    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // Calculate outstanding balance
    const outstandingSum = await supplier_payments.sum('balance_amount', {
      where: {
        supplier_id: req.params.id,
        payment_status: { [Op.in]: ['Pending', 'Partially Paid', 'Overdue'] }
      }
    }) || 0.00;

    // Convert to JSON and attach outstanding balance
    const result = supplier.toJSON();
    result.outstanding_balance = parseFloat(outstandingSum);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/procurement/suppliers/:id
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // status and rating have dedicated endpoints
    const { status, performance_rating, supplier_code, ...updateFields } = req.body;
    await supplier.update(updateFields);

    await logActivity(
      req.user?.user_id, req.user?.role,
      'UPDATE_SUPPLIER',
      `Updated supplier ${supplier.supplier_code} — ${supplier.supplier_name}`,
      getIp(req)
    );

    res.status(200).json({ message: 'Supplier updated successfully', data: supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/procurement/suppliers/:id/status
exports.updateSupplierStatus = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active or Inactive' });
    }

    if (status === 'Inactive') {
      const openCount = await purchase_orders.count({
        where: { supplier_id: req.params.id, status: { [Op.in]: ['Pending', 'Approved', 'Shipped'] } },
      });
      if (openCount > 0) {
        return res.status(400).json({ error: 'Cannot deactivate supplier with open purchase orders' });
      }
    }

    await supplier.update({ status });

    await logActivity(
      req.user?.user_id, req.user?.role,
      'UPDATE_SUPPLIER_STATUS',
      `Set supplier ${supplier.supplier_code} status to ${status}`,
      getIp(req)
    );

    res.status(200).json({ message: 'Supplier status updated', data: supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/procurement/suppliers/:id/rating
exports.updateSupplierRating = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const rating = parseInt(req.body.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    await supplier.update({ performance_rating: rating });

    await logActivity(
      req.user?.user_id, req.user?.role,
      'UPDATE_SUPPLIER_RATING',
      `Rated supplier ${supplier.supplier_code} as ${rating}/5`,
      getIp(req)
    );

    res.status(200).json({ message: 'Supplier rating updated', data: supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getSupplierStatement
 * GET /api/procurement/suppliers/:id/statement
 */
exports.getSupplierStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const supplier = await suppliers.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const orderWhere = { supplier_id: req.params.id, status: { [Op.ne]: 'Cancelled' } };
    const paymentWhere = { supplier_id: req.params.id, payment_status: { [Op.ne]: 'Cancelled' } };

    if (startDate && endDate) {
      orderWhere.po_date = { [Op.between]: [startDate, endDate] };
      paymentWhere.due_date = { [Op.between]: [startDate, endDate] };
    }

    const [orders, payments] = await Promise.all([
      purchase_orders.findAll({ where: orderWhere, order: [['po_date', 'ASC']] }),
      supplier_payments.findAll({ where: paymentWhere, order: [['created_at', 'ASC']] })
    ]);

    const totalPurchased = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.paid_amount), 0);
    const balanceDue = totalPurchased - totalPaid;

    res.json({
      supplier,
      orders,
      payments,
      stats: {
        totalPurchased,
        totalPaid,
        balanceDue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * downloadStatementPDF
 * GET /api/procurement/suppliers/:id/statement/pdf
 */
exports.downloadStatementPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const supplier = await suppliers.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const orderWhere = { supplier_id: req.params.id, status: { [Op.ne]: 'Cancelled' } };
    const paymentWhere = { supplier_id: req.params.id, payment_status: { [Op.ne]: 'Cancelled' } };

    if (startDate && endDate) {
      orderWhere.po_date = { [Op.between]: [startDate, endDate] };
      paymentWhere.due_date = { [Op.between]: [startDate, endDate] };
    }

    const [orders, payments] = await Promise.all([
      purchase_orders.findAll({ where: orderWhere }),
      supplier_payments.findAll({ where: paymentWhere })
    ]);

    const pdfBuffer = await pdfService.generateSupplierStatementPDF(
      supplier,
      payments,
      orders,
      { startDate, endDate }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Statement_${supplier.supplier_code || supplier.supplier_id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
