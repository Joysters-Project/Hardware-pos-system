const { brands, products } = require('../models');

// CREATE Brand
exports.createBrand = async (req, res) => {
  try {
    const { brand_name } = req.body;

    // Check if brand_name is provided
    if (!brand_name || !brand_name.trim()) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    // Check for duplicate brand name (case-insensitive)
    const existingBrand = await brands.findOne({
      where: { brand_name: brand_name.trim() }
    });

    if (existingBrand) {
      return res.status(409).json({ 
        error: "Brand name already exists",
        message: `A brand with name "${brand_name}" already exists`
      });
    }

    const newBrand = await brands.create({ 
      brand_name: brand_name.trim() 
    });

    res.status(201).json({
      message: "Brand created successfully",
      data: newBrand
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Brands
exports.getAllBrands = async (req, res) => {
  try {
    const brandList = await brands.findAll({
      order: [['brand_id', 'DESC']]
    });

    res.status(200).json(brandList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Brand by ID
exports.getBrandById = async (req, res) => {
  try {
    const brand = await brands.findById(req.params.id);

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
    const brand = await brands.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const { brand_name } = req.body;

    // Check if brand_name is provided
    if (brand_name && brand_name.trim()) {
      // Check for duplicate brand name (excluding current brand)
      const existingBrand = await brands.findOne({
        where: { 
          brand_name: brand_name.trim(),
          brand_id: { $ne: req.params.id }
        }
      });

      if (existingBrand) {
        return res.status(409).json({ 
          error: "Brand name already exists",
          message: `A brand with name "${brand_name}" already exists`
        });
      }

      await brand.update({ brand_name: brand_name.trim() });
    }

    res.status(200).json({
      message: "Brand updated successfully",
      data: brand
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Brand (with product check)
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await brands.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check if any products are linked to this brand
    const productCount = await products.count({
      where: { brand_id: req.params.id }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete brand",
        message: `This brand has ${productCount} linked product(s). Please update or remove the product(s) first.`,
        linkedProductCount: productCount
      });
    }

    await brand.destroy();

    res.status(200).json({
      message: "Brand deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
