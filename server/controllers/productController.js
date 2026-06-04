const { products, category, brands, units } = require('../models');

const EXCLUDE = ['repair_quantity', 'expiry_date']; // columns not yet in live DB

// CREATE product
exports.createProduct = async (req, res) => {
  try {
    // Strip out columns that don't exist in the live DB before inserting
    const { repair_quantity, expiry_date, ...safeBody } = req.body;
    const product = await products.create(safeBody);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('createProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// READ all products
exports.getAllProducts = async (req, res) => {
  try {
    const productList = await products.findAll({
      attributes: { exclude: EXCLUDE },
      include: [
        { model: category, attributes: ['category_id', 'category_name'] },
        { model: brands,   attributes: ['brand_id', 'brand_name'] },
        { model: units,    attributes: ['unit_id', 'unit_name'] },
      ],
    });
    res.status(200).json(productList);
  } catch (error) {
    console.error('getAllProducts error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// READ single product
exports.getProductById = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id, {
      attributes: { exclude: EXCLUDE },
      include: [
        { model: category, attributes: ['category_id', 'category_name'] },
        { model: brands,   attributes: ['brand_id', 'brand_name'] },
        { model: units,    attributes: ['unit_id', 'unit_name'] },
      ],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    console.error('getProductById error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE product
exports.updateProduct = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id, {
      attributes: { exclude: EXCLUDE },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { repair_quantity, expiry_date, ...safeBody } = req.body;
    await product.update(safeBody);
    res.status(200).json({ message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('updateProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// DELETE product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.destroy();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('deleteProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};