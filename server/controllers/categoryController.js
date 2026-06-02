const { category, products } = require('../models');

// CREATE Category
exports.createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;

    // Check if category_name is provided
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check for duplicate category name (case-insensitive)
    const existingCategory = await category.findOne({
      where: { category_name: category_name.trim() }
    });

    if (existingCategory) {
      return res.status(409).json({ 
        error: "Category name already exists",
        message: `A category with name "${category_name}" already exists`
      });
    }

    const newCategory = await category.create({ 
      category_name: category_name.trim() 
    });

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Categories
exports.getAllCategory = async (req, res) => {
  try {
    const category = await category.findAll({
      order: [['category_id', 'DESC']]
    });

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const Category = await category.findByPk(req.params.id);

    if (!Category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(Category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Category
exports.updateCategory = async (req, res) => {
  try {
    const Category = await category.findByPk(req.params.id);

    if (!Category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { category_name } = req.body;

    // Check if category_name is provided
    if (category_name && category_name.trim()) {
      // Check for duplicate category name (excluding current category)
      const existingCategory = await category.findOne({
        where: { 
          category_name: category_name.trim(),
          category_id: { [require('sequelize').Op.ne]: req.params.id }
        }
      });

      if (existingCategory) {
        return res.status(409).json({ 
          error: "Category name already exists",
          message: `A category with name "${category_name}" already exists`
        });
      }

      await Category.update({ category_name: category_name.trim() });
    }

    res.status(200).json({
      message: "Category updated successfully",
      data: Category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Category (with product check)
exports.deleteCategory = async (req, res) => {
  try {
    const Category = await category.findByPk(req.params.id);

    if (!Category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if any products are linked to this category
    const productCount = await products.count({
      where: { category_id: req.params.id }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete category",
        message: `This category has ${productCount} linked product(s). Please update or remove the product(s) first.`,
        linkedProductCount: productCount
      });
    }

    await Category.destroy();

    res.status(200).json({
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};