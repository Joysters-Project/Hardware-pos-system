const { bill_items } = require('../models');

// CREATE Bill Item
exports.createBillItem = async (req, res) => {
  try {
    const billItem = await bill_items.create(req.body);

    res.status(201).json({
      message: "Bill item created successfully",
      data: billItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Bill Items
exports.getAllBillItems = async (req, res) => {
  try {
    const billItems = await bill_items.findAll();

    res.status(200).json(billItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Bill Item by Bill ID and Product ID
exports.getBillItem = async (req, res) => {
  try {
    const { bill_id, product_id } = req.params;

    const billItem = await bill_items.findOne({
      where: { bill_id, product_id }
    });

    if (!billItem) {
      return res.status(404).json({ message: "Bill item not found" });
    }

    res.status(200).json(billItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Bill Item
exports.updateBillItem = async (req, res) => {
  try {
    const { bill_id, product_id } = req.params;

    const billItem = await bill_items.findOne({
      where: { bill_id, product_id }
    });

    if (!billItem) {
      return res.status(404).json({ message: "Bill item not found" });
    }

    await billItem.update(req.body);

    res.status(200).json({
      message: "Bill item updated successfully",
      data: billItem
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Bill Item
exports.deleteBillItem = async (req, res) => {
  try {
    const { bill_id, product_id } = req.params;

    const billItem = await bill_items.findOne({
      where: { bill_id, product_id }
    });

    if (!billItem) {
      return res.status(404).json({ message: "Bill item not found" });
    }

    await billItem.destroy();

    res.status(200).json({
      message: "Bill item deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};