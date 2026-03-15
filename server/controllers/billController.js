const { bills } = require('../models');

// CREATE Bill
exports.createBill = async (req, res) => {
  try {
    const bill = await bills.create(req.body);

    res.status(201).json({
      message: "Bill created successfully",
      data: bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Bills
exports.getAllBills = async (req, res) => {
  try {
    const billList = await bills.findAll();

    res.status(200).json(billList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Bill by ID
exports.getBillById = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Bill
exports.updateBill = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await bill.update(req.body);

    res.status(200).json({
      message: "Bill updated successfully",
      data: bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Bill
exports.deleteBill = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await bill.destroy();

    res.status(200).json({
      message: "Bill deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};