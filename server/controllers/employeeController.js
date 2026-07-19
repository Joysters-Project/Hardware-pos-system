const db = require('../models');
const { Op } = require('sequelize');
const fs   = require('fs');
const path = require('path');
const { logActivity } = require('../services/auditService');
const { validateSriLankanPhone, normalizeSriLankanPhone } = require('../utils/phoneValidation');

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

const getAllEmployees = async (req, res) => {
  try {
    const { search, status, department_id } = req.query;
    const where = {};
    if (status)        where.status        = status;
    if (department_id) where.department_id = department_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name:  { [Op.like]: `%${search}%` } },
        { email:      { [Op.like]: `%${search}%` } },
        { phone_no:   { [Op.like]: `%${search}%` } },
        { nic:        { [Op.like]: `%${search}%` } },
      ];
    }
    const list = await db.employees.findAll({
      where,
      subQuery: false,
      include: [{ model: db.departments, attributes: ['department_name'] }],
      order: [[db.sequelize.col('employees.created_at'), 'DESC']],
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const emp = await db.employees.findByPk(req.params.id, {
      include: [{ model: db.departments, attributes: ['department_name', 'department_id'] }],
    });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEmployee = async (req, res) => {
  const ip = getIp(req);
  try {
    const { first_name, last_name, nic, phone_no, email, address, position, salary, join_date, status, department_id } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ message: 'First name and last name are required' });
    if (email) { const ex = await db.employees.findOne({ where: { email } }); if (ex) return res.status(400).json({ message: 'Email already in use' }); }
    if (nic)   { const ex = await db.employees.findOne({ where: { nic   } }); if (ex) return res.status(400).json({ message: 'NIC already in use' }); }

    const trimmedFirst = first_name.trim();
    const trimmedLast = last_name.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedNic = nic?.trim() || null;

    // Validate phone number if provided
    let validatedPhone = phone_no || null;
    if (phone_no) {
      const phoneValidation = validateSriLankanPhone(phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: `Invalid phone number: ${phoneValidation.message}` });
      }
      validatedPhone = phoneValidation.formatted;
    }

    const nameDuplicate = await db.employees.findOne({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
      },
    });
    if (nameDuplicate) return res.status(400).json({ message: 'Employee with same name already exists' });

    const duplicate = await db.employees.findOne({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: normalizedEmail,
        phone_no: validatedPhone,
        nic: normalizedNic,
      },
    });
    if (duplicate) return res.status(400).json({ message: 'Employee with same details already exists' });

    const profile_photo = req.file ? `uploads/employee_photos/${req.file.filename}` : null;
    const emp = await db.employees.create({
      first_name: trimmedFirst, last_name: trimmedLast, nic: normalizedNic, phone_no: validatedPhone,
      email: normalizedEmail, address: address || null, position: position || null,
      salary: salary || null, join_date: join_date || null, hire_date: join_date || null,
      status: status || 'Active', profile_photo, department_id: department_id || null,
    });
    const userId = req.user?.user_id;
    const role   = req.user?.role;
    await logActivity(userId, role, 'CREATE_EMPLOYEE', `Employee created: ${trimmedFirst} ${trimmedLast} (ID: ${emp.employee_id}), Position: ${position || '—'}`, ip);

    res.status(201).json({ message: 'Employee created successfully', data: emp });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: 'NIC, phone, or email already exists' });
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  const ip = getIp(req);
  try {
    const emp = await db.employees.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const { first_name, last_name, nic, phone_no, email, address, position, salary, join_date, status, department_id } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ message: 'First name and last name are required' });

    const trimmedFirst = first_name.trim();
    const trimmedLast = last_name.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedNic = nic?.trim() || null;

    // Validate phone number if provided
    let validatedPhone = phone_no || null;
    if (phone_no) {
      const phoneValidation = validateSriLankanPhone(phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: `Invalid phone number: ${phoneValidation.message}` });
      }
      validatedPhone = phoneValidation.formatted;
    }

    const nameDuplicate = await db.employees.findOne({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        employee_id: { [Op.ne]: emp.employee_id },
      },
    });
    if (nameDuplicate) return res.status(400).json({ message: 'Another employee with same name already exists' });

    const duplicate = await db.employees.findOne({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: normalizedEmail,
        phone_no: validatedPhone,
        nic: normalizedNic,
        employee_id: { [Op.ne]: emp.employee_id },
      },
    });
    if (duplicate) return res.status(400).json({ message: 'Another employee with same details already exists' });

    // Build change log
    const changes = [];
    if (emp.phone_no !== validatedPhone) changes.push(`Phone changed from ${emp.phone_no || '—'} to ${validatedPhone || '—'}`);
    if (emp.position !== position) changes.push(`Position changed from ${emp.position || '—'} to ${position || '—'}`);
    if (String(emp.salary) !== String(salary)) changes.push(`Salary changed from ${emp.salary || '—'} to ${salary || '—'}`);
    if (emp.status !== status)     changes.push(`Status changed from ${emp.status} to ${status}`);
    if (emp.email !== email)       changes.push(`Email changed from ${emp.email || '—'} to ${email || '—'}`);

    let profile_photo = emp.profile_photo;
    if (req.file) {
      if (emp.profile_photo) { const old = path.join(__dirname, '..', emp.profile_photo); if (fs.existsSync(old)) fs.unlinkSync(old); }
      profile_photo = `uploads/employee_photos/${req.file.filename}`;
      changes.push('Profile photo updated');
    }

    await emp.update({
      first_name, last_name, nic: nic || null, phone_no: validatedPhone,
      email: email || null, address: address || null, position: position || null,
      salary: salary || null, join_date: join_date || null, hire_date: join_date || null,
      status: status || emp.status, profile_photo, department_id: department_id || null,
    });

    const detail = `Employee ID ${emp.employee_id} (${first_name} ${last_name}) updated.${changes.length ? ' ' + changes.join('. ') : ' No field changes.'}`;
    await logActivity(req.user?.user_id, req.user?.role, 'UPDATE_EMPLOYEE', detail, ip);

    res.status(200).json({ message: 'Employee updated successfully', data: emp });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ message: 'NIC, phone, or email already exists' });
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const ip = getIp(req);
  try {
    const emp = await db.employees.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    if (emp.profile_photo) { const p = path.join(__dirname, '..', emp.profile_photo); if (fs.existsSync(p)) fs.unlinkSync(p); }
    const name = `${emp.first_name} ${emp.last_name}`;
    await emp.destroy();

    await logActivity(req.user?.user_id, req.user?.role, 'DELETE_EMPLOYEE', `Employee deleted: ${name} (ID: ${req.params.id})`, ip);
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };