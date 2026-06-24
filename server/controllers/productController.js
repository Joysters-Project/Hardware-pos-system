const { products, category, brands, units } = require('../models');
const { logActivity } = require('../services/auditService');

const EXCLUDE = [];
const getIp   = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

exports.createProduct = async (req, res) => {
  const ip = getIp(req);
  try {
    const safeBody = req.body;
    const product = await products.create(safeBody);
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_ADD',
      `Product added: "${product.product_name}" (ID: ${product.product_id}), Stock: ${product.stock_quantity}, Price: ${product.selling_price}`, ip);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('createProduct error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const productList = await products.findAll({
      attributes: { exclude: EXCLUDE },
      include: [
        { model: category, attributes: ['category_id', 'category_name'] },
        { model: brands,   attributes: ['brand_id',   'brand_name']   },
        { model: units,    attributes: ['unit_id',    'unit_name']    },
      ],
    });
    res.status(200).json(productList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await products.findByPk(req.params.id, {
      attributes: { exclude: EXCLUDE },
      include: [
        { model: category, attributes: ['category_id', 'category_name'] },
        { model: brands,   attributes: ['brand_id',   'brand_name']   },
        { model: units,    attributes: ['unit_id',    'unit_name']    },
      ],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  const ip = getIp(req);
  try {
    const product = await products.findByPk(req.params.id, { attributes: { exclude: EXCLUDE } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const changes = [];
    const safeBody = req.body;
    if (safeBody.stock_quantity !== undefined && String(product.stock_quantity) !== String(safeBody.stock_quantity))
      changes.push(`Stock changed from ${product.stock_quantity} to ${safeBody.stock_quantity}`);
    if (safeBody.selling_price !== undefined && String(product.selling_price) !== String(safeBody.selling_price))
      changes.push(`Price changed from ${product.selling_price} to ${safeBody.selling_price}`);
    if (safeBody.product_name && product.product_name !== safeBody.product_name)
      changes.push(`Name changed from "${product.product_name}" to "${safeBody.product_name}"`);

    await product.update(safeBody);
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_UPDATE',
      `Product ID ${product.product_id} ("${product.product_name}") updated.${changes.length ? ' ' + changes.join('. ') : ''}`, ip);
    res.status(200).json({ message: 'Product updated successfully', data: product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const ip = getIp(req);
  try {
    const product = await products.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const name = product.product_name;
    await product.destroy();
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_DELETE',
      `Product deleted: "${name}" (ID: ${req.params.id})`, ip);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
