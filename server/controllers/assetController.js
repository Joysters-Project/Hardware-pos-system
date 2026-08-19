const db = require('../models');
const { Op } = require('sequelize');

const getAllAssets = async (req, res) => {
  try {
    const { search, status, department_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    if (search) where.asset_name = { $like: `%${search}%` };

    const list = await db.assets.findAll({
      where,
      subQuery: false,
      include: [{ model: db.departments, attributes: ['department_name'] }],
      order: [['asset_id', 'DESC']]
    });

    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAssetById = async (req, res) => {
  try {
    const asset = await db.assets.findById(req.params.id, {
      include: [
        { model: db.departments, attributes: ['department_name'] },
        { model: db.expenses, attributes: ['expense_id', 'expense_type', 'amount', 'expense_date'] }
      ]
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.status(200).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    console.log('Asset Create Request Body:', req.body);

    const {
      asset_name, department_id, cost, purchase_date, expiration_date,
      status, condition_type, custom_condition,
      add_as_expense, expense_type, expense_amount, expense_description
    } = req.body;

    if (!asset_name || !department_id || !purchase_date) {
      return res.status(400).json({ message: 'asset_name, department_id, purchase_date are required' });
    }

    const parsedDepartmentId = parseInt(department_id, 10);
    if (!Number.isInteger(parsedDepartmentId)) {
      return res.status(400).json({ message: 'department_id must be an integer' });
    }

    const dept = await db.departments.findById(parsedDepartmentId);
    if (!dept) return res.status(400).json({ message: 'Department not found' });

    const assetCost = parseFloat(cost || 0);
    const deptBudget = parseFloat(dept.budget || 0);
    const activeCost = await db.assets.sum('cost', {
      where: { department_id: parsedDepartmentId, status: { $ne: 'Disposed' } }
    }) || 0;

    if (deptBudget > 0 && activeCost + assetCost > deptBudget) {
      return res.status(400).json({
        message: `Insufficient budget. Available: ${deptBudget - activeCost}, Required: ${assetCost}`
      });
    }

    const asset = await db.assets.create({
      asset_name,
      department_id: parsedDepartmentId,
      cost: assetCost,
      purchase_date,
      expiration_date: expiration_date || null,
      status: status || 'Active',
      condition_type: condition_type || 'Good',
      custom_condition: condition_type === 'Other' ? (custom_condition || null) : null
    });

    await dept.update({ used_budget: activeCost + assetCost });

    let expense = null;
    if (add_as_expense === true || add_as_expense === 'true') {
      expense = await db.expenses.create({
        expense_type: expense_type || 'Asset Purchase',
        amount: expense_amount || assetCost,
        description: expense_description || `Asset purchase: ${asset_name}`,
        expense_date: purchase_date,
        department_id: parsedDepartmentId,
        asset_id: asset.asset_id
      });
    }

    res.status(201).json({
      message: 'Asset created successfully',
      data: asset,
      expense: expense || null
    });
  } catch (error) {
    console.error('Asset Create Error:', error);
    return res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

const updateAsset = async (req, res) => {
  try {
    console.log('Asset Update Request Body:', req.body);

    const asset = await db.assets.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const oldCost   = parseFloat(asset.cost || 0);
    const oldDeptId = asset.department_id;

    const {
      asset_name, department_id, cost, purchase_date, expiration_date,
      status, condition_type, custom_condition
    } = req.body;

    const newCost   = parseFloat(cost !== undefined ? cost : oldCost);
    const newStatus = status || asset.status;
    const newDeptId = parseInt(department_id || oldDeptId, 10);

    if (!Number.isInteger(newDeptId)) {
      return res.status(400).json({ message: 'department_id must be an integer' });
    }

    const dept = await db.departments.findById(newDeptId);
    if (!dept) return res.status(400).json({ message: 'Department not found' });

    await asset.update({
      asset_name: asset_name || asset.asset_name,
      department_id: newDeptId,
      cost: newCost,
      purchase_date: purchase_date || asset.purchase_date,
      expiration_date: expiration_date || null,
      status: newStatus,
      condition_type: condition_type || asset.condition_type,
      custom_condition: condition_type === 'Other' ? (custom_condition || null) : null
    });

    const linkedExpense = await db.expenses.findOne({ where: { asset_id: asset.asset_id } });
    if (linkedExpense) {
      const syncDate = (purchase_date && purchase_date !== '') ? purchase_date : linkedExpense.expense_date;
      const syncName = (asset_name && asset_name !== '') ? asset_name : asset.asset_name;
      await linkedExpense.update({
        amount:        newCost,
        expense_date:  syncDate,
        department_id: newDeptId,
        description:   `Asset purchase: ${syncName}`
      });
    }

    await recalcDeptBudget(oldDeptId);
    if (newDeptId !== oldDeptId) await recalcDeptBudget(newDeptId);

    res.status(200).json({ message: 'Asset updated successfully', data: asset });
  } catch (error) {
    console.error('Asset Update Error:', error);
    return res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

const disposeAsset = async (req, res) => {
  try {
    const asset = await db.assets.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    await asset.update({ status: 'Disposed' });
    await recalcDeptBudget(asset.department_id);

    res.status(200).json({ message: 'Asset marked as Disposed', data: asset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await db.assets.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (asset.status !== 'Disposed') {
      return res.status(400).json({ message: 'Only Disposed assets can be permanently deleted. Use dispose endpoint first.' });
    }

    const deptId = asset.department_id;
    await asset.destroy();
    await recalcDeptBudget(deptId);

    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: recalculate department used_budget
async function recalcDeptBudget(department_id) {
  const total = await db.assets.sum('cost', {
    where: { department_id, status: { $ne: 'Disposed' } }
  }) || 0;
  await db.departments.update({ used_budget: total }, { where: { department_id } });
}

module.exports = { getAllAssets, getAssetById, createAsset, updateAsset, disposeAsset, deleteAsset };
