const db = require('../models');
const { Op } = require('sequelize');

const getAllExpenses = async (req, res) => {
  try {
    const { search, expense_type, department_id } = req.query;
    const where = {};
    if (expense_type) where.expense_type = expense_type;
    if (department_id) where.department_id = department_id;
    if (search) {
      where[Op.or] = [
        { expense_type: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const list = await db.expenses.findAll({
      where,
      include: [
        { model: db.departments, attributes: ['department_name'] },
        { model: db.assets, attributes: ['asset_name'] }
      ],
      order: [['expense_date', 'DESC']]
    });

    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await db.expenses.findByPk(req.params.id, {
      include: [
        { model: db.departments, attributes: ['department_name'] },
        { model: db.assets, attributes: ['asset_name', 'status'] }
      ]
    });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const { expense_type, amount, description, expense_date, department_id, asset_id } = req.body;

    if (!expense_type || !amount || !expense_date) {
      return res.status(400).json({ message: 'expense_type, amount, expense_date are required' });
    }

    const expense = await db.expenses.create({
      expense_type, amount, description: description || null,
      expense_date,
      department_id: department_id || null,
      asset_id: asset_id || null
    });

    res.status(201).json({ message: 'Expense created successfully', data: expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await db.expenses.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const { expense_type, amount, description, expense_date, department_id, asset_id } = req.body;
    await expense.update({ expense_type, amount, description, expense_date, department_id, asset_id });

    res.status(200).json({ message: 'Expense updated successfully', data: expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await db.expenses.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await expense.destroy();
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpenseSummary = async (req, res) => {
  try {
    const { department_id } = req.query;
    const where = department_id ? { department_id } : {};

    const total = await db.expenses.sum('amount', { where }) || 0;
    const byType = await db.expenses.findAll({
      where,
      attributes: ['expense_type', [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
      group: ['expense_type'],
      raw: true
    });

    res.status(200).json({ total, by_type: byType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getExpenseSummary };
