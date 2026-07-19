const db = require('../models');
const { Op } = require('sequelize');

const getAllDepartments = async (req, res) => {
  try {
    const { search } = req.query;
    const where = search
      ? { department_name: { [Op.like]: `%${search}%` } }
      : {};

    const list = await db.departments.findAll({
      where,
      include: [
        { model: db.employees, attributes: ['employee_id'] },
        { model: db.assets, attributes: ['asset_id', 'cost', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const result = list.map(d => {
      const dept = d.toJSON();
      const activeCost = (dept.assets || [])
        .filter(a => a.status !== 'Disposed')
        .reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);
      return {
        ...dept,
        employee_count: (dept.employees || []).length,
        asset_count: (dept.assets || []).length,
        used_budget: activeCost,
        remaining_budget: parseFloat(dept.budget || 0) - activeCost
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const dept = await db.departments.findByPk(req.params.id, {
      include: [
        {
          model: db.employees,
          attributes: ['employee_id', 'first_name', 'last_name', 'position', 'email', 'phone_no', 'status', 'profile_photo']
        },
        {
          model: db.assets,
          attributes: ['asset_id', 'asset_name', 'cost', 'status', 'condition_type', 'purchase_date']
        },
        {
          model: db.expenses,
          attributes: ['expense_id', 'expense_type', 'amount', 'expense_date', 'description']
        }
      ]
    });

    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const data = dept.toJSON();
    const activeCost = (data.assets || [])
      .filter(a => a.status !== 'Disposed')
      .reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);

    res.status(200).json({
      ...data,
      employee_count: (data.employees || []).length,
      asset_count: (data.assets || []).length,
      used_budget: activeCost,
      remaining_budget: parseFloat(data.budget || 0) - activeCost
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { department_name, budget, description, status } = req.body;
    if (!department_name) return res.status(400).json({ message: 'Department name is required' });

    const exists = await db.departments.findOne({ where: { department_name } });
    if (exists) return res.status(400).json({ message: 'Department name already exists' });

    const dept = await db.departments.create({
      department_name,
      budget: budget || 0,
      description: description || null,
      status: status || 'Active',
      used_budget: 0
    });

    res.status(201).json({ message: 'Department created successfully', data: dept });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const dept = await db.departments.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const { department_name, budget, description, status } = req.body;

    if (department_name && department_name !== dept.department_name) {
      const exists = await db.departments.findOne({ where: { department_name } });
      if (exists) return res.status(400).json({ message: 'Department name already exists' });
    }

    await dept.update({ department_name, budget, description, status });
    res.status(200).json({ message: 'Department updated successfully', data: dept });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const dept = await db.departments.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const empCount = await db.employees.count({ where: { department_id: req.params.id } });
    if (empCount > 0) return res.status(400).json({ message: 'Cannot delete department with active employees' });

    await dept.destroy();
    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment };