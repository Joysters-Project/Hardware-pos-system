const { products } = require('../models');

// CREATE product
exports.createProduct = async (req, res) => {
  try {
    const product = await products.create(req.body);
    res.status(201).json({
      message: "Product created successfully",
      data: product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ all products
exports.getAllProducts = async (req, res) => {
  try {
    const productList = await products.findAll();
    res.status(200).json(productList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ single product
exports.getProductById = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE product
exports.updateProduct = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.update(req.body);

    res.status(200).json({
      message: "Product updated successfully",
      data: product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.destroy();

    res.status(200).json({
      message: "Product deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};