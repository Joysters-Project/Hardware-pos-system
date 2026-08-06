const { products, category, brands, units, batch_inventory } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/auditService');
const { syncAlertsForProduct } = require('../services/alertService');
const EXCLUDE = ['repair_quantity'];
const getIp   = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

exports.createProduct = async (req, res) => {
  const ip = getIp(req);
  try {
    const safeBody = req.body;
    const product = await products.create(safeBody);
    
    if (safeBody.alternative_units && Array.isArray(safeBody.alternative_units)) {
      const altUnits = safeBody.alternative_units.map(item => ({
        product_id: product.product_id,
        unit_id: parseInt(item.unit_id),
        conversion_factor: parseFloat(item.conversion_factor),
        unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
        cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
        barcode: item.barcode || null
      }));
      await product_units.bulkCreate(altUnits);
    }

    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_ADD',
      `Product added: "${product.product_name}" (ID: ${product.product_id}), Stock: ${product.stock_quantity}, Price: ${product.unit_price}`, ip);
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
        {
          model: product_units,
          as: 'alternative_units',
          include: [
            { model: units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] }
          ]
        }
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
        {
          model: product_units,
          as: 'alternative_units',
          include: [
            { model: units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] }
          ]
        }
      ],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const plain = product.toJSON();
    if (batch_inventory) {
      const batch = await batch_inventory.findOne({
        where: { product_id: plain.product_id, remaining_quantity: { [Op.gt]: 0 }, status: 'Active' },
        attributes: ['batch_number'],
        order: [['expiry_date', 'ASC']],
      });
      plain.batch_number = batch?.batch_number || plain.batch_no || null;
    } else {
      plain.batch_number = plain.batch_no || null;
    }

    res.status(200).json(plain);
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
    if (safeBody.unit_price !== undefined && String(product.unit_price) !== String(safeBody.unit_price))
      changes.push(`Price changed from ${product.unit_price} to ${safeBody.unit_price}`);
    if (safeBody.product_name && product.product_name !== safeBody.product_name)
      changes.push(`Name changed from "${product.product_name}" to "${safeBody.product_name}"`);

    await product.update(safeBody);
    await product.reload();

    if (safeBody.alternative_units !== undefined && Array.isArray(safeBody.alternative_units)) {
      await product_units.destroy({ where: { product_id: product.product_id } });
      const altUnits = safeBody.alternative_units.map(item => ({
        product_id: product.product_id,
        unit_id: parseInt(item.unit_id),
        conversion_factor: parseFloat(item.conversion_factor),
        unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
        cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
        barcode: item.barcode || null
      }));
      await product_units.bulkCreate(altUnits);
    }

    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) io.emit('alerts:updated');
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
