const { category, products } = require('../models');
const { logActivity } = require('../services/auditService');

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
const toTitleCase = (str) => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();

// CREATE Category
exports.createCategory = async (req, res) => {
  const ip = getIp(req);
  try {
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    if (!/^[A-Za-z\s]+$/.test(category_name.trim())) {
      return res.status(400).json({ error: "Category name can contain letters and spaces only. Numbers and symbols are not allowed." });
    }

    if (category_name.trim().length > 50) {
      return res.status(400).json({ error: "Category name must be 50 characters or fewer." });
    }

    const normalized = toTitleCase(category_name);

    const existingCategory = await category.findOne({
      where: { category_name: normalized }
    });

    if (existingCategory) {
      return res.status(409).json({ 
        error: "Category name already exists",
        message: `A category with name "${normalized}" already exists`
      });
    }

    const newCategory = await category.create({ category_name: normalized });
    await logActivity(req.user?.user_id, req.user?.role, 'CREATE_CATEGORY',
      `Category created: "${normalized}" (ID: ${newCategory.category_id})`, ip);

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await category.findAll({
      order: [['category_id', 'DESC']]
    });

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
  const ip = getIp(req);
  try {
    const Category = await category.findByPk(req.params.id);

    if (!Category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { category_name } = req.body;
    const oldName = Category.category_name;

    // Check if category_name is provided
    if (category_name && category_name.trim()) {
      if (!/^[A-Za-z\s]+$/.test(category_name.trim())) {
        return res.status(400).json({ error: "Category name can contain letters and spaces only. Numbers and symbols are not allowed." });
      }
      if (category_name.trim().length > 50) {
        return res.status(400).json({ error: "Category name must be 50 characters or fewer." });
      }
      const normalized = toTitleCase(category_name);

      const existingCategory = await category.findOne({
        where: { 
          category_name: normalized,
          category_id: { [require('sequelize').Op.ne]: req.params.id }
        }
      });

      if (existingCategory) {
        return res.status(409).json({ 
          error: "Category name already exists",
          message: `A category with name "${normalized}" already exists`
        });
      }

      await Category.update({ category_name: normalized });
      await logActivity(req.user?.user_id, req.user?.role, 'UPDATE_CATEGORY',
        `Category ID ${req.params.id} updated: "${oldName}" -> "${normalized}"`, ip);
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
  const ip = getIp(req);
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

    const name = Category.category_name;
    await Category.destroy();
    await logActivity(req.user?.user_id, req.user?.role, 'DELETE_CATEGORY',
      `Category deleted: "${name}" (ID: ${req.params.id})`, ip);

    res.status(200).json({
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};