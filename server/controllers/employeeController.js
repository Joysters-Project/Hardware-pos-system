const db = require('../models');
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
      const { Op } = require('sequelize');
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
      order: [['employee_id', 'DESC']],
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee id.' });
    }

    const emp = await db.employees.findOne({
      where: { employee_id: employeeId },
      include: [{ model: db.departments, attributes: ['department_name', 'department_id'] }],
    });

    if (!emp) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: emp
    });
  } catch (error) {
    console.error('Get Employee Error:', error);
    console.error(error.stack || error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createEmployee = async (req, res) => {
  const ip = getIp(req);
  try {
    const { first_name, last_name, nic, phone_no, email, address, position, salary, salary_category, join_date, status, department_id } = req.body;
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
      salary: salary || null, salary_category: salary_category || 'monthly',
      join_date: join_date || null, hire_date: join_date || null,
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
    console.log('Update Employee Payload:', req.body);

    const employeeId = parseInt(req.params.id, 10);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }

    const emp = await db.employees.findOne({ where: { employee_id: employeeId } });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const { first_name, last_name, nic, phone_no, email, address, position, salary, salary_category, join_date, status, department_id } = req.body;
    console.log('Employee Update Request Body:', req.body);
    if (!first_name || !last_name) return res.status(400).json({ message: 'First name and last name are required' });

    const deptId = department_id !== undefined ? parseInt(department_id, 10) : emp.department_id;
    if (!deptId) return res.status(400).json({ message: 'Department is required' });

    const deptExists = await db.departments.findOne({ where: { department_id: deptId } });
    if (!deptExists) return res.status(400).json({ message: 'Invalid department' });

    const trimmedFirst = first_name.trim();
    const trimmedLast  = last_name.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedNic   = nic?.trim() || null;

    let validatedPhone = phone_no || null;
    if (phone_no) {
      const phoneValidation = validateSriLankanPhone(phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: `Invalid phone number: ${phoneValidation.message}` });
      }
      validatedPhone = phoneValidation.formatted;
    }

    const existingEmployees = await db.employees.findAll({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
      },
      attributes: ['employee_id']
    });
    const otherEmployee = existingEmployees.find((candidate) => candidate.employee_id !== emp.employee_id);
    if (otherEmployee) return res.status(400).json({ message: 'Another employee with same name already exists' });

    const duplicateCandidates = await db.employees.findAll({
      where: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: normalizedEmail,
        phone_no: validatedPhone,
        nic: normalizedNic,
      },
      attributes: ['employee_id']
    });
    const duplicate = duplicateCandidates.find((candidate) => candidate.employee_id !== emp.employee_id);
    if (duplicate) return res.status(400).json({ message: 'Another employee with same details already exists' });

    // Build change log
    const changes = [];
    if (emp.phone_no !== validatedPhone)   changes.push(`Phone: ${emp.phone_no || '—'} → ${validatedPhone || '—'}`);
    if (emp.position !== position)         changes.push(`Position: ${emp.position || '—'} → ${position || '—'}`);
    if (String(emp.salary) !== String(salary)) changes.push(`Salary: ${emp.salary || '—'} → ${salary || '—'}`);
    if (emp.status !== status)             changes.push(`Status: ${emp.status} → ${status}`);
    if (emp.email !== normalizedEmail)     changes.push(`Email: ${emp.email || '—'} → ${normalizedEmail || '—'}`);

    let profile_photo = emp.profile_photo;
    if (req.file) {
      if (emp.profile_photo) {
        const old = path.join(__dirname, '..', emp.profile_photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      profile_photo = `uploads/employee_photos/${req.file.filename}`;
      changes.push('Profile photo updated');
    }

    await emp.update({
      first_name:      trimmedFirst,
      last_name:       trimmedLast,
      nic:             normalizedNic,
      phone_no:        validatedPhone,
      email:           normalizedEmail,
      address:         address  || null,
      position:        position || null,
      salary:          salary   ?? emp.salary,
      salary_category: salary_category || emp.salary_category,
      join_date:       join_date || null,
      hire_date:       join_date || null,
      status:          status   || emp.status,
      profile_photo,
      department_id:   deptId,
    });

    const detail = `Employee ID ${emp.employee_id} (${trimmedFirst} ${trimmedLast}) updated.${
      changes.length ? ' ' + changes.join('. ') : ' No field changes.'
    }`;
    await logActivity(req.user?.user_id, req.user?.role, 'UPDATE_EMPLOYEE', detail, ip);

    res.status(200).json({ message: 'Employee updated successfully', data: emp });
  } catch (error) {
    console.error('Update Employee Error:', error.message);
    console.error(error.stack);
    if (error.name === 'SequelizeUniqueConstraintError')      return res.status(400).json({ message: 'NIC, phone, or email already exists' });
    if (error.name === 'SequelizeValidationError')            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
    if (error.name === 'SequelizeForeignKeyConstraintError')  return res.status(400).json({ message: 'Invalid department or foreign key reference' });
    if (error.name === 'SequelizeDatabaseError')              return res.status(500).json({ message: `Database error: ${error.message}` });
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  const ip = getIp(req);
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (!Number.isInteger(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }

    const emp = await db.employees.findOne({ where: { employee_id: employeeId } });
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