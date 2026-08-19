const { customers } = require('../models');
const { validateSriLankanPhone } = require('../utils/phoneValidation');

// CREATE Customer
exports.createCustomer = async (req, res) => {
  try {
    // Validate phone number if provided
    let customerData = { ...req.body };
    if (customerData.phone_no) {
      const phoneValidation = validateSriLankanPhone(customerData.phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number: ${phoneValidation.message}` 
        });
      }
      customerData.phone_no = phoneValidation.formatted;
    }

    const customer = await customers.create(customerData);

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
    const customer = await customers.findById(req.params.id);

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
    const customer = await customers.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate phone number if provided
    let updateData = { ...req.body };
    if (updateData.phone_no) {
      const phoneValidation = validateSriLankanPhone(updateData.phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number: ${phoneValidation.message}` 
        });
      }
      updateData.phone_no = phoneValidation.formatted;
    }

    await customer.update(updateData);

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
    const customer = await customers.findById(req.params.id);

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
