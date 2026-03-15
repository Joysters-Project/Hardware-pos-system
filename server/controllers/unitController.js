const { units } = require('../models');

// CREATE Unit
exports.createUnit = async (req, res) => {
  try {
    const unit = await units.create(req.body);

    res.status(201).json({
      message: "Unit created successfully",
      data: unit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Units
exports.getAllUnits = async (req, res) => {
  try {
    const unitList = await units.findAll();

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

    await unit.update(req.body);

    res.status(200).json({
      message: "Unit updated successfully",
      data: unit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Unit
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await units.findByPk(req.params.id);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    await unit.destroy();

    res.status(200).json({
      message: "Unit deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};