const { returns } = require('../models');

// CREATE Return
exports.createReturn = async (req, res) => {
  try {
    const newReturn = await returns.create(req.body);

    res.status(201).json({
      message: "Return created successfully",
      data: newReturn
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Returns
exports.getAllReturns = async (req, res) => {
  try {
    const returnList = await returns.findAll();

    res.status(200).json(returnList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Return by ID
exports.getReturnById = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    res.status(200).json(returnItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Return
exports.updateReturn = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    await returnItem.update(req.body);

    res.status(200).json({
      message: "Return updated successfully",
      data: returnItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Return
exports.deleteReturn = async (req, res) => {
  try {
    const returnItem = await returns.findByPk(req.params.id);

    if (!returnItem) {
      return res.status(404).json({ message: "Return not found" });
    }

    await returnItem.destroy();

    res.status(200).json({
      message: "Return deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};