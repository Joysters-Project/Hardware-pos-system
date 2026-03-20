const { suppliers } = require('../models');

// CREATE Supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplier = await suppliers.create(req.body);

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

    await supplier.update(req.body);

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