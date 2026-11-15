const db = require('../models');
const { createChequeNotification, NOTIF_TYPES } = require('../services/chequeExchangeNotificationService');
const { validateSriLankanPhone } = require('../utils/phoneValidation');
const Op = db.Sequelize.Op;
const isValidSriLankanNic = (nic) => /^\d{12}$/.test(nic) || /^\d{9}[vVxX]$/.test(nic);
const getVarcharLengthError = (values, limits) => {
  for (const [field, limit] of Object.entries(limits)) {
    if (values[field] != null && String(values[field]).length > limit) {
      return `${field} cannot exceed ${limit} characters`;
    }
  }
  return null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcFinancials = (cheque_amount, discount_percentage) => {
  const amount = parseFloat(cheque_amount) || 0;
  const pct    = parseFloat(discount_percentage) || 0;
  const service_charge          = parseFloat((amount * pct / 100).toFixed(2));
  const amount_paid_to_customer = parseFloat((amount - service_charge).toFixed(2));
  return { service_charge, amount_paid_to_customer };
};

const parseChequeAmount = (value) => {
  const amount = String(value ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amount)) return NaN;
  return Number(amount.replace(/,/g, ''));
};

const getIo = (req) => req.app.get('io');

// ─── CUSTOMER ENDPOINTS ───────────────────────────────────────────────────────

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      const s = `%${search}%`;
      where[Op.or] = [
        { customer_name: { [Op.like]: s } },
        { nic_number:    { [Op.like]: s } },
        { phone_number:  { [Op.like]: s } },
      ];
    }

    const customers = await db.cheque_customers.findAll({
      where,
      include: [{
        model: db.customer_cheques,
        as: 'cheques',
        attributes: ['cheque_id', 'cheque_amount', 'cheque_status', 'repayment_status', 'repayment_amount'],
      }],
      order: [['created_at', 'DESC']],
      logging: console.log,
    });

    const customerRows = customers.map(c => ({
      ...c.toJSON(),
      total_cheques: (c.cheques || []).length,
      total_cheque_amount: parseFloat((c.cheques || []).reduce((s, ch) => s + parseFloat(ch.cheque_amount || 0), 0).toFixed(2)),
      outstanding_repayment: parseFloat((c.cheques || [])
        .filter(ch => ch.repayment_status === 'Pending')
        .reduce((s, ch) => s + parseFloat(ch.repayment_amount || 0), 0)
        .toFixed(2)),
    }));

    const result = search ? customerRows.filter((customer) => {
      const s = search.toLowerCase();
      return (
        String(customer.customer_id).toLowerCase().includes(s) ||
        (customer.customer_name || '').toLowerCase().includes(s) ||
        (customer.nic_number || '').toLowerCase().includes(s) ||
        (customer.phone_number || '').toLowerCase().includes(s)
      );
    }) : customerRows;

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await db.cheque_customers.findByPk(req.params.id, {
      include: [{
        model: db.customer_cheques,
        as: 'cheques',
        order: [['created_at', 'DESC']],
      }],
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const cheques = customer.cheques || [];
    const summary = {
      total_cheques:          cheques.length,
      total_cheque_value:     cheques.reduce((s, c) => s + parseFloat(c.cheque_amount || 0), 0),
      total_cash_paid:        cheques.reduce((s, c) => s + parseFloat(c.amount_paid_to_customer || 0), 0),
      total_service_charges:  cheques.reduce((s, c) => s + parseFloat(c.service_charge || 0), 0),
      outstanding_repayment:  cheques.filter(c => c.repayment_status === 'Pending').reduce((s, c) => s + parseFloat(c.repayment_amount || 0), 0),
    };

    const customerData = customer.toJSON();
    res.json({ success: true, data: { ...customerData, summary } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { customer_name, nic_number, phone_number, address } = req.body;
    if (!customer_name || !nic_number || !phone_number || !address) {
      return res.status(400).json({ success: false, message: 'All customer fields are required' });
    }
    const varcharError = getVarcharLengthError(req.body, { customer_name: 150, nic_number: 20, phone_number: 20 });
    if (varcharError) return res.status(400).json({ success: false, message: varcharError });
    const normalizedNic = String(nic_number).trim();
    if (!isValidSriLankanNic(normalizedNic)) {
      return res.status(400).json({ success: false, message: 'NIC number must be 9 digits + V/X or 12 digits' });
    }
    const phoneValidation = validateSriLankanPhone(phone_number);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.message });
    }
    const validatedPhone = phoneValidation.formatted;

    const existing = await db.cheque_customers.findOne({
      where: {
        [Op.or]: [
          { customer_name },
          { nic_number: normalizedNic },
          { phone_number: validatedPhone },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Customer with the same name, NIC, or phone number already exists',
      });
    }

    const customer = await db.cheque_customers.create({ customer_name, nic_number: normalizedNic, phone_number: validatedPhone, address });
    res.status(201).json({ success: true, data: customer });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'NIC number already exists' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await db.cheque_customers.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const { customer_name, nic_number, phone_number, address } = req.body;
    if (!customer_name || !nic_number || !phone_number || !address) {
      return res.status(400).json({ success: false, message: 'All customer fields are required' });
    }
    const varcharError = getVarcharLengthError(req.body, { customer_name: 150, nic_number: 20, phone_number: 20 });
    if (varcharError) return res.status(400).json({ success: false, message: varcharError });
    const normalizedNic = String(nic_number).trim();
    if (!isValidSriLankanNic(normalizedNic)) {
      return res.status(400).json({ success: false, message: 'NIC number must be 9 digits + V/X or 12 digits' });
    }
    const phoneValidation = validateSriLankanPhone(phone_number);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.message });
    }
    const validatedPhone = phoneValidation.formatted;

    // Check uniqueness for name, NIC and phone (exclude self)
    const dup = await db.cheque_customers.findOne({
      where: {
        customer_id: {
          [db.Sequelize.Op.ne]: customer.customer_id,
        },
        [Op.or]: [
          { customer_name },
          { nic_number: normalizedNic },
          { phone_number: validatedPhone },
        ],
      },
    });
    if (dup) {
      return res.status(409).json({
        success: false,
        message: 'Customer name, NIC, or phone number is already used by another customer',
      });
    }

    await customer.update({ customer_name, nic_number: normalizedNic, phone_number: validatedPhone, address });
    res.json({ success: true, data: customer });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await db.cheque_customers.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const chequeCount = await db.customer_cheques.count({ where: { customer_id: req.params.id } });
    if (chequeCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete customer with existing cheques' });
    }

    await customer.destroy();
    res.json({ success: true, message: 'Customer deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── CHEQUE ENDPOINTS ─────────────────────────────────────────────────────────

const getCheques = async (req, res) => {
  try {
    const { search, cheque_status, repayment_status, bank_name, customer_id, date_from, date_to } = req.query;

    const where = {};
    if (cheque_status)    where.cheque_status    = cheque_status;
    if (repayment_status) where.repayment_status = repayment_status;
    if (bank_name)        where.bank_name        = bank_name;
    if (customer_id)      where.customer_id      = customer_id;
    if (date_from || date_to) {
      where.received_date = {};
      if (date_from) where.received_date[Op.gte] = date_from;
      if (date_to)   where.received_date[Op.lte] = date_to;
    }

    if (search) {
      const s = `%${search}%`;
      const normalizedSearch = `%${search.toLowerCase()}%`;
      const matchingCustomers = await db.cheque_customers.findAll({
        attributes: ['customer_id'],
        where: {
          [Op.or]: [
            db.Sequelize.where(
              db.Sequelize.fn('LOWER', db.Sequelize.col('customer_name')),
              { [Op.like]: normalizedSearch }
            ),
            db.Sequelize.where(
              db.Sequelize.fn('LOWER', db.Sequelize.col('nic_number')),
              { [Op.like]: normalizedSearch }
            ),
            db.Sequelize.where(
              db.Sequelize.fn('LOWER', db.Sequelize.col('phone_number')),
              { [Op.like]: normalizedSearch }
            ),
          ],
        },
        raw: true,
      });
      const customerIds = matchingCustomers.map((customer) => customer.customer_id);
      if (/^\d+$/.test(search)) customerIds.push(Number(search));

      where[Op.or] = [
        { cheque_number:        { [Op.like]: s } },
        { bank_name:            { [Op.like]: s } },
        { account_holder_name:  { [Op.like]: s } },
        ...(customerIds.length ? [{ customer_id: { [Op.in]: customerIds } }] : []),
        ...(/^\d+$/.test(search) ? [{ cheque_id: Number(search) }] : []),
      ];
    }

    const cheques = await db.customer_cheques.findAll({
      where,
      include: [
        { model: db.cheque_customers, as: 'customer', attributes: ['customer_id', 'customer_name', 'nic_number', 'phone_number'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: cheques });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getChequeById = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id, {
      include: [
        { model: db.cheque_customers, as: 'customer' },
      ],
    });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    res.json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createCheque = async (req, res) => {
  try {
    const {
      customer_id, cheque_number, bank_name, account_holder_name,
      cheque_date, expected_clearance_date, cheque_amount, discount_percentage,
      received_date, remarks,
    } = req.body;

    // Validations
    if (!customer_id || !cheque_number || !bank_name || !account_holder_name || !cheque_date || !expected_clearance_date || !cheque_amount || !received_date) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    const varcharError = getVarcharLengthError(req.body, { cheque_number: 100, bank_name: 100, account_holder_name: 150 });
    if (varcharError) return res.status(400).json({ success: false, message: varcharError });
    const amount = parseChequeAmount(cheque_amount);
    if (!Number.isFinite(amount)) {
      return res.status(400).json({ success: false, message: 'Cheque amount must be a valid number with up to 2 decimal places' });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Cheque amount must be greater than 0' });
    }
    const pct = Number(discount_percentage);
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be a whole number from 1 to 100' });
    }
    if (new Date(expected_clearance_date) < new Date(cheque_date)) {
      return res.status(400).json({ success: false, message: 'Expected clearance date cannot be earlier than cheque date' });
    }

    // Cheque number uniqueness (allow if previous is Cancelled)
    const dupCheque = await db.customer_cheques.findOne({
      where: {
        cheque_number,
        cheque_status: {
          [db.Sequelize.Op.ne]: 'Cancelled',
        },
      },
    });
    if (dupCheque) {
      return res.status(409).json({ success: false, message: 'Cheque number already exists and is not cancelled' });
    }

    const customer = await db.cheque_customers.findByPk(customer_id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const { service_charge, amount_paid_to_customer } = calcFinancials(amount, pct);

    const cheque = await db.customer_cheques.create({
      customer_id,
      cheque_number,
      bank_name,
      account_holder_name,
      cheque_date,
      expected_clearance_date,
      cheque_amount: amount,
      discount_percentage: pct,
      service_charge,
      amount_paid_to_customer,
      cheque_status: 'Pending',
      received_date,
      repayment_required: false,
      repayment_status: 'Not Required',
      remarks: remarks || null,
      created_by: req.user?.user_id || null,
      updated_by: req.user?.user_id || null,
    });

    await createChequeNotification(getIo(req), {
      cheque_id: cheque.cheque_id,
      customer_name: customer.customer_name,
      cheque_number,
      type: NOTIF_TYPES.CHEQUE_RECEIVED,
    });

    res.status(201).json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateCheque = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id, {
      include: [{ model: db.cheque_customers, as: 'customer' }],
    });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });

    const {
      cheque_number, bank_name, account_holder_name, cheque_date,
      expected_clearance_date, cheque_amount, discount_percentage,
      received_date, remarks,
    } = req.body;

    const varcharError = getVarcharLengthError(req.body, { cheque_number: 100, bank_name: 100, account_holder_name: 150 });
    if (varcharError) return res.status(400).json({ success: false, message: varcharError });

    const amount = parseChequeAmount(cheque_amount);
    if (!Number.isFinite(amount)) {
      return res.status(400).json({ success: false, message: 'Cheque amount must be a valid number with up to 2 decimal places' });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Cheque amount must be greater than 0' });
    }
    const pct = Number(discount_percentage);
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be a whole number from 1 to 100' });
    }
    if (new Date(expected_clearance_date) < new Date(cheque_date)) {
      return res.status(400).json({ success: false, message: 'Expected clearance date cannot be earlier than cheque date' });
    }

    // Cheque number uniqueness (exclude self, allow if previous is Cancelled)
    const dup = await db.customer_cheques.findOne({
      where: {
        cheque_number,
        cheque_status: {
          [db.Sequelize.Op.ne]: 'Cancelled',
        },
        cheque_id: {
          [db.Sequelize.Op.ne]: cheque.cheque_id,
        },
      },
    });
    if (dup) return res.status(409).json({ success: false, message: 'Cheque number already exists' });

    const { service_charge, amount_paid_to_customer } = calcFinancials(amount, pct);

    await cheque.update({
      cheque_number, bank_name, account_holder_name, cheque_date,
      expected_clearance_date, cheque_amount: amount, discount_percentage: pct,
      service_charge, amount_paid_to_customer, received_date,
      remarks: remarks || null,
      updated_by: req.user?.user_id || null,
    });

    res.json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateChequeStatus = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id, {
      include: [{ model: db.cheque_customers, as: 'customer' }],
    });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });

    const { cheque_status, deposited_date, cleared_date, remarks } = req.body;
    const validTransitions = { Pending: ['Cleared', 'Bounced', 'Cancelled'] };
    const allowed = validTransitions[cheque.cheque_status] || [];

    if (!allowed.includes(cheque_status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${cheque.cheque_status} to ${cheque_status}`,
      });
    }

    const updates = {
      cheque_status,
      updated_by: req.user?.user_id || null,
      remarks: remarks || cheque.remarks,
    };

    if (cheque_status === 'Cleared') {
      updates.cleared_date = cleared_date || new Date().toISOString().split('T')[0];
      updates.repayment_required = false;
      updates.repayment_status = 'Not Required';
    }

    if (cheque_status === 'Bounced') {
      updates.repayment_required = true;
      updates.repayment_amount = cheque.amount_paid_to_customer;
      updates.repayment_status = 'Pending';
    }

    if (deposited_date) updates.deposited_date = deposited_date;

    await cheque.update(updates);

    const customer = cheque.customer;
    const notifTypeMap = {
      Cleared:   NOTIF_TYPES.CHEQUE_CLEARED,
      Bounced:   NOTIF_TYPES.CHEQUE_BOUNCED,
      Cancelled: NOTIF_TYPES.CHEQUE_CANCELLED,
    };

    await createChequeNotification(getIo(req), {
      cheque_id: cheque.cheque_id,
      customer_name: customer?.customer_name || '',
      cheque_number: cheque.cheque_number,
      type: notifTypeMap[cheque_status],
    });

    if (cheque_status === 'Bounced') {
      await createChequeNotification(getIo(req), {
        cheque_id: cheque.cheque_id,
        customer_name: customer?.customer_name || '',
        cheque_number: cheque.cheque_number,
        type: NOTIF_TYPES.REPAYMENT_REQUIRED,
      });
    }

    res.json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const depositCheque = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id, {
      include: [{ model: db.cheque_customers, as: 'customer' }],
    });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    if (cheque.cheque_status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending cheques can be deposited' });
    }

    const deposited_date = req.body.deposited_date || new Date().toISOString().split('T')[0];
    await cheque.update({ deposited_date, updated_by: req.user?.user_id || null });

    await createChequeNotification(getIo(req), {
      cheque_id: cheque.cheque_id,
      customer_name: cheque.customer?.customer_name || '',
      cheque_number: cheque.cheque_number,
      type: NOTIF_TYPES.CHEQUE_DEPOSITED,
    });

    res.json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const recordRepayment = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id, {
      include: [{ model: db.cheque_customers, as: 'customer' }],
    });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    if (cheque.cheque_status !== 'Bounced') {
      return res.status(400).json({ success: false, message: 'Repayment can only be recorded for bounced cheques' });
    }

    await cheque.update({
      repayment_status: 'Paid',
      updated_by: req.user?.user_id || null,
    });

    await createChequeNotification(getIo(req), {
      cheque_id: cheque.cheque_id,
      customer_name: cheque.customer?.customer_name || '',
      cheque_number: cheque.cheque_number,
      type: NOTIF_TYPES.REPAYMENT_DONE,
    });

    res.json({ success: true, data: cheque });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteCheque = async (req, res) => {
  try {
    const cheque = await db.customer_cheques.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
    await cheque.destroy();
    res.json({ success: true, message: 'Cheque deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const getDashboard = async (req, res) => {
  try {
    const [
      total_customers,
      total_cheques,
      pending_cheques,
      cleared_cheques,
      bounced_cheques,
      cancelled_cheques,
    ] = await Promise.all([
      db.cheque_customers.count(),
      db.customer_cheques.count(),
      db.customer_cheques.count({ where: { cheque_status: 'Pending' } }),
      db.customer_cheques.count({ where: { cheque_status: 'Cleared' } }),
      db.customer_cheques.count({ where: { cheque_status: 'Bounced' } }),
      db.customer_cheques.count({ where: { cheque_status: 'Cancelled' } }),
    ]);

    const allCheques = await db.customer_cheques.findAll({
      attributes: ['cheque_amount', 'amount_paid_to_customer', 'service_charge', 'cheque_status', 'repayment_status', 'repayment_amount'],
      raw: true,
    });

    const total_cheque_value = allCheques.reduce((s, c) => s + parseFloat(c.cheque_amount || 0), 0);
    const total_cash_paid    = allCheques.reduce((s, c) => s + parseFloat(c.amount_paid_to_customer || 0), 0);
    const total_service_charges = allCheques.reduce((s, c) => s + parseFloat(c.service_charge || 0), 0);
    const total_profit       = allCheques.filter(c => c.cheque_status === 'Cleared').reduce((s, c) => s + parseFloat(c.service_charge || 0), 0);
    const outstanding_repayments = allCheques.filter(c => c.repayment_status === 'Pending').reduce((s, c) => s + parseFloat(c.repayment_amount || 0), 0);

    res.json({
      success: true,
      data: {
        total_customers,
        total_cheques,
        pending_cheques,
        cleared_cheques,
        bounced_cheques,
        cancelled_cheques,
        total_cheque_value:     parseFloat(total_cheque_value.toFixed(2)),
        total_cash_paid:        parseFloat(total_cash_paid.toFixed(2)),
        total_service_charges:  parseFloat(total_service_charges.toFixed(2)),
        total_profit:           parseFloat(total_profit.toFixed(2)),
        outstanding_repayments: parseFloat(outstanding_repayments.toFixed(2)),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────

const getReports = async (req, res) => {
  try {
    const { report_type, date_from, date_to, bank_name, customer_id } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.received_date = {};
      if (date_from) where.received_date[Op.gte] = date_from;
      if (date_to)   where.received_date[Op.lte] = date_to;
    }
    if (bank_name)   where.bank_name   = bank_name;
    if (customer_id) where.customer_id = customer_id;

    const statusMap = {
      pending:    'Pending',
      cleared:    'Cleared',
      bounced:    'Bounced',
      cancelled:  'Cancelled',
    };
    if (statusMap[report_type]) where.cheque_status = statusMap[report_type];
    if (report_type === 'outstanding_repayment') where.repayment_status = 'Pending';

    const cheques = await db.customer_cheques.findAll({
      where,
      include: [{ model: db.cheque_customers, as: 'customer', attributes: ['customer_name', 'nic_number', 'phone_number'] }],
      order: [['received_date', 'DESC']],
    });

    // Monthly summary
    let monthly_summary = [];
    if (report_type === 'monthly_summary') {
      const rows = await db.customer_cheques.findAll({
        attributes: [
          [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('received_date'), '%Y-%m'), 'month'],
          [db.sequelize.fn('COUNT', db.sequelize.col('cheque_id')), 'total_cheques'],
          [db.sequelize.fn('SUM', db.sequelize.col('cheque_amount')), 'total_amount'],
          [db.sequelize.fn('SUM', db.sequelize.col('service_charge')), 'total_service_charge'],
          [db.sequelize.fn('SUM', db.sequelize.col('amount_paid_to_customer')), 'total_cash_paid'],
        ],
        group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('received_date'), '%Y-%m')],
        order: [[db.sequelize.fn('DATE_FORMAT', db.sequelize.col('received_date'), '%Y-%m'), 'DESC']],
        raw: true,
      });
      monthly_summary = rows;
    }

    // Bank-wise summary
    let bank_summary = [];
    if (report_type === 'bank_wise') {
      const rows = await db.customer_cheques.findAll({
        attributes: [
          'bank_name',
          [db.sequelize.fn('COUNT', db.sequelize.col('cheque_id')), 'total_cheques'],
          [db.sequelize.fn('SUM', db.sequelize.col('cheque_amount')), 'total_amount'],
          [db.sequelize.fn('SUM', db.sequelize.col('service_charge')), 'total_service_charge'],
        ],
        group: ['bank_name'],
        order: [[db.sequelize.fn('SUM', db.sequelize.col('cheque_amount')), 'DESC']],
        raw: true,
      });
      bank_summary = rows;
    }

    res.json({ success: true, data: cheques, monthly_summary, bank_summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── BANKS LIST (for filter dropdown) ────────────────────────────────────────

const getBanks = async (req, res) => {
  try {
    const rows = await db.customer_cheques.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('bank_name')), 'bank_name']],
      raw: true,
    });
    res.json({ success: true, data: rows.map(r => r.bank_name).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getCheques, getChequeById, createCheque, updateCheque, updateChequeStatus,
  depositCheque, recordRepayment, deleteCheque,
  getDashboard, getReports, getBanks,
};
