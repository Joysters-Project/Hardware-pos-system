const { po_items } = require('../models');

// CREATE PO Item
exports.createPoItem = async (req, res) => {
  try {
    const poItem = await po_items.create(req.body);

    res.status(201).json({
      message: "PO Item created successfully",
      data: poItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All PO Items
exports.getAllPoItems = async (req, res) => {
  try {
    const poItems = await po_items.findAll();

    res.status(200).json(poItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PO Item by ID
exports.getPoItemById = async (req, res) => {
  try {
    const poItem = await po_items.findByPk(req.params.id);

    if (!poItem) {
      return res.status(404).json({ message: "PO Item not found" });
    }

    res.status(200).json(poItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE PO Item
exports.updatePoItem = async (req, res) => {
  try {
    const poItem = await po_items.findByPk(req.params.id);

    if (!poItem) {
      return res.status(404).json({ message: "PO Item not found" });
    }

    await poItem.update(req.body);

    res.status(200).json({
      message: "PO Item updated successfully",
      data: poItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE PO Item
exports.deletePoItem = async (req, res) => {
  try {
    const poItem = await po_items.findByPk(req.params.id);

    if (!poItem) {
      return res.status(404).json({ message: "PO Item not found" });
    }

    await poItem.destroy();

    res.status(200).json({
      message: "PO Item deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};