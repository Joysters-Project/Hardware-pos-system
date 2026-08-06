const db   = require('../models');
const { sendPayslipEmail } = require('../services/salaryService');
const { logActivity } = require('../services/auditService');
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const empInclude = {
  model: db.employees,
  attributes: ['employee_id','first_name','last_name','email','phone_no','position','salary_category','department_id'],
  include: [{ model: db.departments, attributes: ['department_name'] }]
};

// GET /api/salary
const getAllPayments = async (req, res) => {
  try {
    const { employee_id, payment_month, payment_year, status, salary_category, search } = req.query;
    const where = {};
    if (employee_id)     where.employee_id     = employee_id;
    if (payment_month)   where.payment_month   = payment_month;
    if (payment_year)    where.payment_year    = payment_year;
    if (status)          where.payment_status  = status;
    if (salary_category) where.salary_category = salary_category;

    const empWhere = {};
    if (search) {
      const searchPattern = `%${search}%`;
      empWhere.$or = [
        { first_name: { $like: searchPattern } },
        { last_name:  { $like: searchPattern } },
        { email:      { $like: searchPattern } },
        { phone_no:   { $like: searchPattern } }
      ];
    }

    const list = await db.salary_payments.findAll({
      where,
      subQuery: false,
      include: [{ ...empInclude, where: Object.keys(empWhere).length ? empWhere : undefined }],
      order: [['created_at', 'DESC']]
    });
    res.status(200).json(list);
  } catch (error) {
    console.error('Salary fetch error:', error);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/:id
const getPaymentById = async (req, res) => {
  try {
    const record = await db.salary_payments.findById(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/employee/:employee_id
const getEmployeeSalaryHistory = async (req, res) => {
  try {
    const where = { employee_id: req.params.employee_id };
    const list = await db.salary_payments.findAll({
      where,
      include: [empInclude],
      order: [['created_at', 'DESC']]
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/employee/:employee_id/summary
const getEmployeeSalarySummary = async (req, res) => {
  try {
    const empId = req.params.employee_id;
    const currentYear = new Date().getFullYear();
    const [emp, lastPaid, totalPaidYear] = await Promise.all([
      db.employees.findById(empId, { include: [{ model: db.departments, attributes: ['department_name'] }] }),
      db.salary_payments.findOne({
        where: { employee_id: empId, payment_status: 'Paid' },
        order: [['created_at', 'DESC']]
      }),
      db.salary_payments.sum('final_salary', {
        where: { employee_id: empId, payment_status: 'Paid', payment_year: currentYear }
      })
    ]);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json({
      current_salary:       emp.salary,
      salary_category:      emp.salary_category,
      last_payment_date:    lastPaid?.payment_date || null,
      last_payment_month:   lastPaid ? `${lastPaid.payment_month}/${lastPaid.payment_year}` : null,
      total_paid_this_year: totalPaidYear || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/salary
const createPayment = async (req, res) => {
  try {
    console.log('Salary Create Request Body:', req.body);

    const {
      employee_id, salary_category,
      basic_salary, bonus_amount = 0, deduction_amount = 0,
      payment_month, payment_year, payment_date,
      payment_method, remarks
    } = req.body;

    const employee = await db.employees.findById(employee_id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    const resolvedCategory = (salary_category || employee.salary_category || 'monthly').toLowerCase();
    const parsedBasicSalary = parseFloat(basic_salary ?? employee.salary ?? 0);
    const parsedBonus = parseFloat(bonus_amount || 0);
    const parsedDeduction = parseFloat(deduction_amount || 0);
    const final_salary = parsedBasicSalary + parsedBonus - parsedDeduction;

    if (!employee_id || !parsedBasicSalary || !payment_date) {
      return res.status(400).json({ success: false, message: 'employee_id, basic_salary, and payment_date are required' });
    }

    if (final_salary < 0) return res.status(400).json({ success: false, message: 'Final salary cannot be negative.' });

    if (resolvedCategory === 'monthly') {
      if (!payment_month || !payment_year) {
        return res.status(400).json({ success: false, message: 'payment_month and payment_year are required for Monthly Worker' });
      }
      const exists = await db.salary_payments.findOne({
        where: { employee_id, salary_category: 'monthly', payment_month, payment_year }
      });
      if (exists) {
        const monthName = MONTHS[parseInt(payment_month, 10) - 1] || payment_month;
        return res.status(409).json({
          success: false,
          message: 'Salary already paid for this month.'
        });
      }
    } else {
      const exists = await db.salary_payments.findOne({
        where: { employee_id, salary_category: 'daily', payment_date }
      });
      if (exists) {
        const d = new Date(payment_date);
        const formatted = d.toLocaleDateString('en-GB');
        return res.status(409).json({
          success: false,
          message: 'Salary already paid for this date.'
        });
      }
    }

    const record = await db.salary_payments.create({
      employee_id,
      salary_category: resolvedCategory,
      basic_salary: parsedBasicSalary,
      bonus_amount: parsedBonus,
      deduction_amount: parsedDeduction,
      final_salary,
      payment_month: resolvedCategory === 'monthly' ? payment_month : null,
      payment_year:  resolvedCategory === 'monthly' ? payment_year  : null,
      payment_date: payment_date || null,
      payment_status: 'Paid',
      payment_method: payment_method || null,
      remarks: remarks || null
    });

    await logActivity(req.user?.user_id, req.user?.role, 'SALARY_SLIP_CREATED',
      `Salary paid for Employee ID ${employee_id}. Category: ${salary_category}, Amount: ${final_salary}`, getIp(req));

    const full = await db.salary_payments.findById(record.salary_payment_id, { include: [empInclude] });

    if (full.employee?.email) {
      sendPayslipEmail(full.employee.email, `${full.employee.first_name} ${full.employee.last_name}`, full.toJSON(), null)
        .catch(e => console.error('Email failed:', e.message));
    }

    res.status(201).json({ success: true, message: 'Salary paid successfully', data: full });
  } catch (error) {
    console.error('Salary Create Error:', error);
    return res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

// PUT /api/salary/:id/pay — kept for backward compat but simplified
const paySalary = async (req, res) => {
  try {
    const record = await db.salary_payments.findById(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    if (record.payment_status === 'Paid') return res.status(400).json({ message: 'Already paid' });

    const { payment_method, remarks } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const final_salary = parseFloat(record.basic_salary) + parseFloat(record.bonus_amount) - parseFloat(record.deduction_amount);

    await record.update({ payment_status: 'Paid', payment_date: today, final_salary, payment_method: payment_method || record.payment_method, remarks: remarks || record.remarks });

    if (record.employee?.email) {
      sendPayslipEmail(record.employee.email, `${record.employee.first_name} ${record.employee.last_name}`, record.toJSON(), null)
        .catch(e => console.error('Email failed:', e.message));
    }

    res.status(200).json({ message: 'Salary paid successfully', data: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/salary/:id
const updatePayment = async (req, res) => {
  try {
    const record = await db.salary_payments.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    const { basic_salary, bonus_amount, deduction_amount, payment_method, remarks } = req.body;
    const bs = parseFloat(basic_salary ?? record.basic_salary);
    const bn = parseFloat(bonus_amount ?? record.bonus_amount);
    const dd = parseFloat(deduction_amount ?? record.deduction_amount);
    await record.update({ basic_salary: bs, bonus_amount: bn, deduction_amount: dd, final_salary: bs + bn - dd, payment_method: payment_method ?? record.payment_method, remarks: remarks ?? record.remarks });
    res.status(200).json({ message: 'Salary record updated', data: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/:id/download
const downloadPayslip = async (req, res) => {
  try {
    const record = await db.salary_payments.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.status(404).json({ message: 'Payslip downloads are disabled.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [pendingRow, paidRow, activeRow] = await Promise.all([
      db.sequelize.query("SELECT COUNT(*) AS count FROM salary_payments WHERE payment_status = 'Pending'",
        { type: db.Sequelize.QueryTypes.SELECT }),
      db.sequelize.query("SELECT COUNT(*) AS count FROM salary_payments WHERE payment_status = 'Paid' AND payment_month = ? AND payment_year = ?",
        { replacements: [month, year], type: db.Sequelize.QueryTypes.SELECT }),
      db.sequelize.query("SELECT COUNT(*) AS count FROM employees WHERE status = 'Active'",
        { type: db.Sequelize.QueryTypes.SELECT })
    ]);

    res.status(200).json({
      pending: Number(pendingRow?.[0]?.count || 0),
      paid:    Number(paidRow?.[0]?.count    || 0),
      upcoming: Number(activeRow?.[0]?.count || 0),
      showAlert: false,
      currentMonth: month,
      currentYear: year
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/salary/:id/resend-email
const resendPayslipEmail = async (req, res) => {
  try {
    const record = await db.salary_payments.findById(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    if (record.payment_status !== 'Paid') return res.status(400).json({ message: 'Can only resend for paid records' });
    if (!record.employee?.email) return res.status(400).json({ message: 'Employee has no email address on file' });

    const emailResult = await sendPayslipEmail(record.employee.email, `${record.employee.first_name} ${record.employee.last_name}`, record.toJSON(), null);
    if (!emailResult.success) {
      return res.status(200).json({ message: emailResult.skipped ? 'Email skipped: credentials not configured.' : `Email failed: ${emailResult.reason}` });
    }
    res.status(200).json({ message: `Payslip resent to ${record.employee.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllPayments, getPaymentById, getEmployeeSalaryHistory, getEmployeeSalarySummary, createPayment, paySalary, updatePayment, downloadPayslip, getDashboardStats, resendPayslipEmail };
