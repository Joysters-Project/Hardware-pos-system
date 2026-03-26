const { bills, users, customers } = require('../models');

// CREATE Bill
exports.createBill = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const user = await users.findByPk(user_id);
    if (!user) {
      return res.status(400).json({ error: `User with id ${user_id} not found. Please create a user first.` });
    }

    const { customer_id } = req.body;
    if (customer_id) {
      const customer = await customers.findByPk(customer_id);
      if (!customer) {
        return res.status(400).json({ error: "Customer not found" });
      }
    }

    const bill = await bills.create(req.body);

    res.status(201).json({
      message: "Bill created successfully",
      data: bill
    });
  } catch (error) {
    console.error("Create bill error:", error);
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