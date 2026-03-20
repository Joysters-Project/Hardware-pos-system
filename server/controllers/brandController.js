const { brands } = require('../models');

// CREATE Brand
exports.createBrand = async (req, res) => {
  try {
    const brand = await brands.create(req.body);

    res.status(201).json({
      message: "Brand created successfully",
      data: brand
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Brands
exports.getAllBrands = async (req, res) => {
  try {
    const brandList = await brands.findAll();

    res.status(200).json(brandList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Brand by ID
exports.getBrandById = async (req, res) => {
  try {
    const brand = await brands.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Brand
exports.updateBrand = async (req, res) => {
  try {
    const brand = await brands.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    await brand.update(req.body);

    res.status(200).json({
      message: "Brand updated successfully",
      data: brand
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Brand
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await brands.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    await brand.destroy();

    res.status(200).json({
      message: "Brand deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};