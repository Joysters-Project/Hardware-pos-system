const { suppliers } = require('../models');
const { validateSriLankanPhone } = require('../utils/phoneValidation');

// CREATE Supplier
exports.createSupplier = async (req, res) => {
  try {
    let supplierData = { ...req.body };

    // Validate contact/phone number if provided
    if (supplierData.contact) {
      const phoneValidation = validateSriLankanPhone(supplierData.contact);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid contact number: ${phoneValidation.message}`
        });
      }
      supplierData.contact = phoneValidation.formatted;
    }

    const supplier = await suppliers.create(supplierData);

    res.status(201).json({
      message: "Supplier created successfully",
      data: supplier
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const supplierList = await suppliers.findAll();

    res.status(200).json(supplierList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Supplier By ID
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Supplier
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    let updateData = { ...req.body };

    // Validate contact/phone number if provided
    if (updateData.contact) {
      const phoneValidation = validateSriLankanPhone(updateData.contact);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid contact number: ${phoneValidation.message}`
        });
      }
      updateData.contact = phoneValidation.formatted;
    }

    await supplier.update(updateData);

    res.status(200).json({
      message: "Supplier updated successfully",
      data: supplier
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await suppliers.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    await supplier.destroy();

    res.status(200).json({
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};