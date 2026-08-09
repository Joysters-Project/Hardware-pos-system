const { units, products } = require('../models');

const toTitleCase = (str) => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();

// CREATE Unit
exports.createUnit = async (req, res) => {
  try {
    const { unit_name } = req.body;

    if (!unit_name || !unit_name.trim()) {
      return res.status(400).json({ error: "Unit name is required" });
    }

    const normalized = toTitleCase(unit_name);

    const existingUnit = await units.findOne({
      where: { unit_name: normalized }
    });

    if (existingUnit) {
      return res.status(409).json({ 
        error: "Unit name already exists",
        message: `A unit with name "${normalized}" already exists`
      });
    }

    const newUnit = await units.create({ unit_name: normalized });

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
  try {
    const unit = await units.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const { unit_name } = req.body;

    // Check if unit_name is provided
    if (unit_name && unit_name.trim()) {
      const normalized = toTitleCase(unit_name);

      const existingUnit = await units.findOne({
        where: { 
          unit_name: normalized,
          unit_id: { [require('sequelize').Op.ne]: req.params.id }
        }
      });

      if (existingUnit) {
        return res.status(409).json({ 
          error: "Unit name already exists",
          message: `A unit with name "${normalized}" already exists`
        });
      }

      await unit.update({ unit_name: normalized });
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

    await unit.destroy();

    res.status(200).json({
      message: "Unit deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};