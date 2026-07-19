const path = require('path');
const fs   = require('fs');
const db   = require('../models');
const { Op } = require('sequelize');
const { generatePayslipPDF, sendPayslipEmail } = require('../services/salaryService');
const { logActivity } = require('../services/auditService');
const { buildSalaryPeriod } = require('../utils/salaryLogic');
const { syncSalaryAlertState } = require('../services/salaryAlertService');
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

const empInclude = {
  model: db.employees,
  attributes: ['employee_id','first_name','last_name','email','position','department_id'],
  include: [{ model: db.departments, attributes: ['department_name'] }]
};

// GET /api/salary — list with filters
const getAllPayments = async (req, res) => {
  try {
    const { employee_id, payment_month, payment_year, payment_status, search } = req.query;
    const where = {};
    if (employee_id)    where.employee_id    = employee_id;
    if (payment_month)  where.payment_month  = payment_month;
    if (payment_year)   where.payment_year   = payment_year;
    if (payment_status) where.payment_status = payment_status;

    const empWhere = {};
    if (search) {
      empWhere[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name:  { [Op.like]: `%${search}%` } }
      ];
    }

    const list = await db.salary_payments.findAll({
      where,
      subQuery: false,
      include: [{
        ...empInclude,
        where: Object.keys(empWhere).length ? empWhere : undefined
      }],
      order: [['payment_year', 'DESC'], ['payment_month', 'DESC'], [db.sequelize.col('salary_payments.created_at'), 'DESC']]
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/:id
const getPaymentById = async (req, res) => {
  try {
    const record = await db.salary_payments.findByPk(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/employee/:employee_id — full history for one employee
const getEmployeeSalaryHistory = async (req, res) => {
  try {
    const { payment_month, payment_year } = req.query;
    const where = { employee_id: req.params.employee_id };
    if (payment_month) where.payment_month = payment_month;
    if (payment_year)  where.payment_year  = payment_year;

    const list = await db.salary_payments.findAll({
      where,
      include: [empInclude],
      order: [['payment_year', 'DESC'], ['payment_month', 'DESC']]
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/employee/:employee_id/summary — salary summary card data
const getEmployeeSalarySummary = async (req, res) => {
  try {
    const empId = req.params.employee_id;
    const currentYear = new Date().getFullYear();

    const [emp, lastPaid, totalPaidYear] = await Promise.all([
      db.employees.findByPk(empId, { include: [{ model: db.departments, attributes: ['department_name'] }] }),
      db.salary_payments.findOne({
        where: { employee_id: empId, payment_status: 'Paid' },
        order: [['payment_year', 'DESC'], ['payment_month', 'DESC']]
      }),
      db.salary_payments.sum('final_salary', {
        where: { employee_id: empId, payment_status: 'Paid', payment_year: currentYear }
      })
    ]);

    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const nextDue = new Date();
    nextDue.setDate(30);
    if (nextDue <= new Date()) nextDue.setMonth(nextDue.getMonth() + 1);

    res.status(200).json({
      current_salary:      emp.salary,
      last_payment_date:   lastPaid?.payment_date || null,
      last_payment_month:  lastPaid ? `${lastPaid.payment_month}/${lastPaid.payment_year}` : null,
      next_due_date:       nextDue.toISOString().split('T')[0],
      total_paid_this_year: totalPaidYear || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/salary — create pending salary record
const createPayment = async (req, res) => {
  try {
    const { employee_id, basic_salary, bonus_amount = 0, deduction_amount = 0,
            payment_month, payment_year, payment_frequency = 'monthly',
            pay_period_reference_date, pay_period_start_date, pay_period_end_date, due_date,
            payment_method, remarks } = req.body;

    if (!employee_id || !basic_salary || !payment_month || !payment_year) {
      return res.status(400).json({ message: 'employee_id, basic_salary, payment_month, payment_year are required' });
    }

    // Block records before May 2026
    const yr = parseInt(payment_year);
    const mo = parseInt(payment_month);
    if (yr < 2026 || (yr === 2026 && mo < 5)) {
      return res.status(400).json({ message: 'Salary records can only be created from May 2026 onwards.' });
    }

    const referenceDate = pay_period_reference_date || `${payment_year}-${String(payment_month).padStart(2, '0')}-01`;
    const periodData = buildSalaryPeriod(payment_frequency, referenceDate);
    const computedStart = pay_period_start_date || periodData.pay_period_start_date;
    const computedEnd = pay_period_end_date || periodData.pay_period_end_date;
    const computedDueDate = due_date || periodData.due_date;

    const exists = await db.salary_payments.findOne({
      where: {
        employee_id,
        payment_frequency,
        pay_period_start_date: computedStart,
        pay_period_end_date: computedEnd
      }
    });
    if (exists) return res.status(400).json({ message: 'Salary record for this pay period already exists' });

    const final_salary = parseFloat(basic_salary) + parseFloat(bonus_amount) - parseFloat(deduction_amount);

    if (final_salary < 500) {
      return res.status(400).json({ message: 'Final salary must be at least LKR 500.00.' });
    }

    const record = await db.salary_payments.create({
      employee_id, basic_salary, bonus_amount, deduction_amount,
      final_salary, payment_month, payment_year,
      payment_frequency,
      pay_period_start_date: computedStart,
      pay_period_end_date: computedEnd,
      due_date: computedDueDate,
      payment_status: 'Pending', payment_method: payment_method || null,
      alert_status: 'none', alert_message: null,
      remarks: remarks || null
    });

    const alertRecord = await syncSalaryAlertState(record);

    await logActivity(req.user?.user_id, req.user?.role, 'SALARY_SLIP_CREATED',
      `Salary slip created for Employee ID ${employee_id}. Period: ${payment_month}/${payment_year}, Frequency: ${payment_frequency}, Basic: ${basic_salary}`, getIp(req));

    res.status(201).json({ message: 'Salary record created', data: alertRecord });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/salary/:id/pay — mark as Paid, generate PDF, send email
const paySalary = async (req, res) => {
  try {
    const record = await db.salary_payments.findByPk(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    if (record.payment_status === 'Paid') return res.status(400).json({ message: 'Already paid' });

    const { payment_method, remarks } = req.body;

    // Check if a paid record already exists for this employee/month/year
    const existingPaid = await db.salary_payments.findOne({
      where: {
        employee_id: record.employee_id,
        payment_month: record.payment_month,
        payment_year: record.payment_year,
        payment_status: 'Paid',
        salary_payment_id: { [Op.ne]: record.salary_payment_id }
      }
    });
    if (existingPaid && !remarks?.trim()) {
      return res.status(400).json({ message: 'A reason is required to make a second payment for the same month.' });
    }
    const today = new Date().toISOString().split('T')[0];

    // Recalculate final salary in case values were updated
    const final_salary = parseFloat(record.basic_salary) + parseFloat(record.bonus_amount) - parseFloat(record.deduction_amount);

    await record.update({
      payment_status: 'Paid', payment_date: today, final_salary,
      payment_method: payment_method || record.payment_method,
      alert_status: 'none', alert_message: null,
      remarks:        remarks        || record.remarks
    });

    await logActivity(req.user?.user_id, req.user?.role, 'SALARY_SLIP_PAID',
      `Salary paid for Employee ID ${record.employee_id}. Period: ${record.payment_month}/${record.payment_year}, Final: ${final_salary}, Method: ${payment_method || record.payment_method}`, getIp(req));

    // Generate PDF
    let pdfPath = null;
    try {
      pdfPath = await generatePayslipPDF(record.toJSON());
      await record.update({ payslip_pdf_path: pdfPath });
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr.message);
    }

    // Send email (non-blocking)
    if (record.employee?.email) {
      sendPayslipEmail(
        record.employee.email,
        `${record.employee.first_name} ${record.employee.last_name}`,
        record.toJSON(),
        pdfPath
      ).catch(e => console.error('Email failed:', e.message));
    }

    res.status(200).json({ message: 'Salary paid successfully', data: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/salary/:id — update pending record
const updatePayment = async (req, res) => {
  try {
    const record = await db.salary_payments.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary record not found' });

    const { basic_salary, bonus_amount, deduction_amount, payment_month, payment_year,
            payment_frequency, pay_period_reference_date, pay_period_start_date, pay_period_end_date, due_date,
            payment_method, remarks } = req.body;
    const bs = parseFloat(basic_salary ?? record.basic_salary);
    const bn = parseFloat(bonus_amount ?? record.bonus_amount);
    const dd = parseFloat(deduction_amount ?? record.deduction_amount);

    const referenceDate = pay_period_reference_date || `${payment_year ?? record.payment_year}-${String(payment_month ?? record.payment_month).padStart(2, '0')}-01`;
    const periodData = buildSalaryPeriod(payment_frequency ?? record.payment_frequency, referenceDate);
    const nextStart = pay_period_start_date ?? record.pay_period_start_date ?? periodData.pay_period_start_date;
    const nextEnd = pay_period_end_date ?? record.pay_period_end_date ?? periodData.pay_period_end_date;
    const nextDueDate = due_date ?? record.due_date ?? periodData.due_date;

    await record.update({
      basic_salary: bs, bonus_amount: bn, deduction_amount: dd,
      final_salary: bs + bn - dd,
      payment_month: payment_month ?? record.payment_month,
      payment_year:  payment_year  ?? record.payment_year,
      payment_frequency: payment_frequency ?? record.payment_frequency,
      pay_period_start_date: nextStart,
      pay_period_end_date: nextEnd,
      due_date: nextDueDate,
      payment_method: payment_method ?? record.payment_method,
      remarks: remarks ?? record.remarks
    });
    const alertRecord = await syncSalaryAlertState(await db.salary_payments.findByPk(record.salary_payment_id));
    await logActivity(req.user?.user_id, req.user?.role, 'SALARY_SLIP_UPDATED',
      `Salary slip ID ${record.salary_payment_id} updated. Basic salary changed from ${record.basic_salary} to ${bs}`, getIp(req));
    res.status(200).json({ message: 'Salary record updated', data: alertRecord });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/:id/download — stream PDF
const downloadPayslip = async (req, res) => {
  try {
    const record = await db.salary_payments.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    let pdfPath = record.payslip_pdf_path;
    // Regenerate if missing
    if (!pdfPath || !fs.existsSync(path.join(__dirname, '..', pdfPath))) {
      const full = await db.salary_payments.findByPk(req.params.id, { include: [empInclude] });
      pdfPath = await generatePayslipPDF(full.toJSON());
      await record.update({ payslip_pdf_path: pdfPath });
    }

    const absPath = path.join(__dirname, '..', pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(absPath)}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/salary/stats/dashboard — summary cards for dashboard
const getDashboardStats = async (req, res) => {
  try {
    const now    = new Date();
    const month  = now.getMonth() + 1;
    const year   = now.getFullYear();

    const [pending, paid, upcoming, alertCount] = await Promise.all([
      db.salary_payments.count({ where: { payment_status: 'Pending' } }),
      db.salary_payments.count({ where: { payment_status: 'Paid', payment_month: month, payment_year: year } }),
      db.salary_payments.count({ where: { payment_status: 'Pending', payment_month: month, payment_year: year } }),
      db.salary_payments.count({
        where: {
          payment_status: 'Pending',
          due_date: { [Op.lte]: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString().split('T')[0] }
        }
      })
    ]);

    // Employees without salary record this month
    const totalActive = await db.employees.count({ where: { status: 'Active' } });
    const recordedThisMonth = await db.salary_payments.count({ where: { payment_month: month, payment_year: year } });
    const notRecorded = Math.max(0, totalActive - recordedThisMonth);

    const showAlert = alertCount > 0;

    res.status(200).json({ pending, paid, upcoming: upcoming + notRecorded, showAlert, dueDay: 30, currentMonth: month, currentYear: year });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/salary/:id/resend-email — resend payslip to employee
const resendPayslipEmail = async (req, res) => {
  try {
    const record = await db.salary_payments.findByPk(req.params.id, { include: [empInclude] });
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    if (record.payment_status !== 'Paid') return res.status(400).json({ message: 'Can only resend for paid records' });
    if (!record.employee?.email) return res.status(400).json({ message: 'Employee has no email address on file' });

    let pdfPath = record.payslip_pdf_path;
    if (!pdfPath || !fs.existsSync(path.join(__dirname, '..', pdfPath))) {
      pdfPath = await generatePayslipPDF(record.toJSON());
      await record.update({ payslip_pdf_path: pdfPath });
    }

    const emailResult = await sendPayslipEmail(
      record.employee.email,
      `${record.employee.first_name} ${record.employee.last_name}`,
      record.toJSON(),
      pdfPath
    );

    if (!emailResult.success) {
      return res.status(200).json({
        message: emailResult.skipped
          ? `Payslip generated, but email delivery was skipped because credentials are not configured.`
          : `Payslip generated, but email delivery failed: ${emailResult.reason}`
      });
    }

    res.status(200).json({ message: `Payslip resent to ${record.employee.email}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllPayments, getPaymentById, getEmployeeSalaryHistory, getEmployeeSalarySummary, createPayment, paySalary, updatePayment, downloadPayslip, getDashboardStats, resendPayslipEmail };
