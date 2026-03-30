const { category } = require('../models');

// CREATE Category
exports.createCategory = async (req, res) => {
  try {
    const Category = await category.create(req.body);

    res.status(201).json({
      message: "Category created successfully",
      data: Category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await category.findAll();

    res.status(200).json(categories);
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

    await Category.update(req.body);

    res.status(200).json({
      message: "Category updated successfully",
      data: Category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Category
exports.deleteCategory = async (req, res) => {
  try {
    const Category = await category.findByPk(req.params.id);

    if (!Category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await Category.destroy();

    res.status(200).json({
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};