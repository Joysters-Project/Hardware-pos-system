const { customers } = require('../models');

// CREATE Customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = await customers.create(req.body);

    res.status(201).json({
      message: "Customer created successfully",
      data: customer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Customers or GET Customer by phone
exports.getAllCustomers = async (req, res) => {
  try {
    if (req.query.phone) {
      const customer = await customers.findOne({ where: { phone_no: req.query.phone } });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      return res.status(200).json({ data: customer });
    }

    const customerList = await customers.findAll();
    res.status(200).json(customerList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await customers.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await customers.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update(req.body);

    res.status(200).json({
      message: "Customer updated successfully",
      data: customer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await customers.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.destroy();

    res.status(200).json({
      message: "Customer deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};