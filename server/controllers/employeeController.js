const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const getAllEmployees = async (req, res) => {
  try {
    const { search, status, department_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_no: { [Op.like]: `%${search}%` } },
        { nic: { [Op.like]: `%${search}%` } }
      ];
    }

    const list = await db.employees.findAll({
      where,
      include: [{ model: db.departments, attributes: ['department_name'] }],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const emp = await db.employees.findByPk(req.params.id, {
      include: [{ model: db.departments, attributes: ['department_name', 'department_id'] }]
    });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const {
      first_name, last_name, nic, phone_no, email,
      address, position, salary, join_date, status, department_id
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    // Check email uniqueness only if provided
    if (email) {
      const emailExists = await db.employees.findOne({ where: { email } });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
    }

    // Check NIC uniqueness only if provided
    if (nic) {
      const nicExists = await db.employees.findOne({ where: { nic } });
      if (nicExists) return res.status(400).json({ message: 'NIC already in use' });
    }

    const profile_photo = req.file ? `uploads/employee_photos/${req.file.filename}` : null;

    const emp = await db.employees.create({
      first_name,
      last_name,
      nic: nic || null,
      phone_no: phone_no || null,
      email: email || null,
      address: address || null,
      position: position || null,
      salary: salary || null,
      join_date: join_date || null,
      hire_date: join_date || null,
      status: status || 'Active',
      profile_photo,
      department_id: department_id || null
    });

    res.status(201).json({ message: 'Employee created successfully', data: emp });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'NIC, phone, or email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const emp = await db.employees.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const {
      first_name, last_name, nic, phone_no, email,
      address, position, salary, join_date, status, department_id
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    let profile_photo = emp.profile_photo;
    if (req.file) {
      if (emp.profile_photo) {
        const oldPath = path.join(__dirname, '..', emp.profile_photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      profile_photo = `uploads/employee_photos/${req.file.filename}`;
    }

    await emp.update({
      first_name,
      last_name,
      nic: nic || null,
      phone_no: phone_no || null,
      email: email || null,
      address: address || null,
      position: position || null,
      salary: salary || null,
      join_date: join_date || null,
      hire_date: join_date || null,
      status: status || emp.status,
      profile_photo,
      department_id: department_id || null
    });

    res.status(200).json({ message: 'Employee updated successfully', data: emp });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'NIC, phone, or email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const emp = await db.employees.findByPk(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    if (emp.profile_photo) {
      const photoPath = path.join(__dirname, '..', emp.profile_photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }

    await emp.destroy();
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
