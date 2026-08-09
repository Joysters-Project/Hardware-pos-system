const { units, products } = require('../models');
const { logActivity } = require('../services/auditService');

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

// CREATE Unit
exports.createUnit = async (req, res) => {
  const ip = getIp(req);
  try {
    const { unit_name } = req.body;

    if (!unit_name || !unit_name.trim()) {
      return res.status(400).json({ error: "Unit name is required" });
    }

    if (!/^[A-Za-z\s]+$/.test(unit_name.trim())) {
      return res.status(400).json({ error: "Unit name can contain letters and spaces only. Numbers and symbols are not allowed." });
    }

    if (unit_name.trim().length > 50) {
      return res.status(400).json({ error: "Unit name must be 50 characters or fewer." });
    }

    const trimmed = unit_name.trim();

    const existingUnit = await units.findOne({
      where: { unit_name: trimmed }
    });

    if (existingUnit) {
      return res.status(409).json({ 
        error: "Unit name already exists",
        message: `A unit with name "${trimmed}" already exists`
      });
    }

    const newUnit = await units.create({ unit_name: trimmed });
    await logActivity(req.user?.user_id, req.user?.role, 'CREATE_UNIT',
      `Unit created: "${trimmed}" (ID: ${newUnit.unit_id})`, ip);

    res.status(201).json({
      message: "Unit created successfully",
      data: newUnit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Units
exports.getAllUnits = async (req, res) => {
  try {
    const unitList = await units.findAll({
      order: [['unit_id', 'DESC']]
    });

    res.status(200).json(unitList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Unit by ID
exports.getUnitById = async (req, res) => {
  try {
    const unit = await units.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.status(200).json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Unit
exports.updateUnit = async (req, res) => {
  const ip = getIp(req);
  try {
    const unit = await units.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const { unit_name } = req.body;
    const oldName = unit.unit_name;

    // Check if unit_name is provided
    if (unit_name && unit_name.trim()) {
      if (!/^[A-Za-z\s]+$/.test(unit_name.trim())) {
        return res.status(400).json({ error: "Unit name can contain letters and spaces only. Numbers and symbols are not allowed." });
      }
      if (unit_name.trim().length > 50) {
        return res.status(400).json({ error: "Unit name must be 50 characters or fewer." });
      }
      const trimmed = unit_name.trim();

      const existingUnit = await units.findOne({
        where: { 
          unit_name: trimmed,
          unit_id: { [require('sequelize').Op.ne]: req.params.id }
        }
      });

      if (existingUnit) {
        return res.status(409).json({ 
          error: "Unit name already exists",
          message: `A unit with name "${trimmed}" already exists`
        });
      }

      await unit.update({ unit_name: trimmed });
      await logActivity(req.user?.user_id, req.user?.role, 'UPDATE_UNIT',
        `Unit ID ${req.params.id} updated: "${oldName}" -> "${trimmed}"`, ip);
    }

    res.status(200).json({
      message: "Unit updated successfully",
      data: unit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Unit (with product check)
exports.deleteUnit = async (req, res) => {
  const ip = getIp(req);
  try {
    const unit = await units.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    // Check if any products are linked to this unit
    const productCount = await products.count({
      where: { unit_id: req.params.id }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete unit",
        message: `This unit has ${productCount} linked product(s). Please update or remove the product(s) first.`,
        linkedProductCount: productCount
      });
    }

    const name = unit.unit_name;
    await unit.destroy();
    await logActivity(req.user?.user_id, req.user?.role, 'DELETE_UNIT',
      `Unit deleted: "${name}" (ID: ${req.params.id})`, ip);

    res.status(200).json({
      message: "Unit deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};