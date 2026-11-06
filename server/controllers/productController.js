const { products, category, brands, units, batch_inventory, product_units, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/auditService');
const { syncAlertsForProduct } = require('../services/alertService');
const { getProductBatchSummaries, getStoreLocalDate, syncProductFromBatches } = require('../services/batchService');
const EXCLUDE = ['repair_quantity'];
const getIp   = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

exports.createProduct = async (req, res) => {
  const ip = getIp(req);
  let transaction;
  try {
    const safeBody = req.body;
    transaction = await sequelize.transaction();
    const product = await products.create(safeBody, { transaction });
    
    if (safeBody.alternative_units && Array.isArray(safeBody.alternative_units)) {
      const baseCost = parseFloat(product.cost_price || safeBody.cost_price || 0);
      const altUnits = safeBody.alternative_units.map(item => {
        const factor = parseFloat(item.conversion_factor) || 1;
        const computedCost = item.cost_price ? parseFloat(item.cost_price) : (baseCost * factor);
        return {
          product_id: product.product_id,
          unit_id: parseInt(item.unit_id),
          conversion_factor: factor,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          cost_price: computedCost,
          barcode: item.barcode || null
        };
      });
      await product_units.bulkCreate(altUnits, { transaction });
    }

    // Keep initial stock in the same batch ledger used by receiving and sales.
    const initQty = parseFloat(safeBody.stock_quantity) || 0;
    if (initQty > 0) {
      const batchNumber = typeof safeBody.batch_no === 'string' && safeBody.batch_no.trim()
        ? safeBody.batch_no.trim()
        : `OPENING-${product.product_id}`;
      await batch_inventory.create({
        batch_number:       batchNumber,
        product_id:         product.product_id,
        purchase_order_id:  null,
        supplier_id:        null,
        purchase_price:     parseFloat(safeBody.cost_price) || 0,
        received_quantity:  initQty,
        remaining_quantity: initQty,
        received_date:      getStoreLocalDate(),
        expiry_date:        safeBody.expiry_date || null,
        status: safeBody.expiry_date && safeBody.expiry_date < getStoreLocalDate() ? 'Expired' : 'Active',
      }, { transaction });
      await syncProductFromBatches(product.product_id, transaction);
    }

    await transaction.commit();
    await product.reload();
    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) { io.emit('alerts:updated'); io.emit('products:updated'); }
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_ADD',
      `Product added: "${product.product_name}" (ID: ${product.product_id}), Stock: ${product.stock_quantity}, Price: ${product.unit_price}`, ip);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
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
    const summaries = await getProductBatchSummaries(productList.map(product => product.product_id));
    const result = productList.map(product => {
      const data = product.toJSON();
      const summary = summaries.get(Number(product.product_id));
      if (summary?.has_batches) {
        data.stock_quantity = summary.stock_quantity;
        data.batch_no = summary.batch_no;
        data.batch_number = summary.batch_number;
        data.expiry_date = summary.expiry_date;
      } else {
        data.batch_number = data.batch_no || null;
      }
      return data;
    });
    res.status(200).json(result);
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
    const summary = (await getProductBatchSummaries([plain.product_id])).get(Number(plain.product_id));
    if (summary?.has_batches) {
      plain.stock_quantity = summary.stock_quantity;
      plain.batch_no = summary.batch_no;
      plain.batch_number = summary.batch_number;
      plain.expiry_date = summary.expiry_date;
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
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const product = await products.findByPk(req.params.id, {
      attributes: { exclude: EXCLUDE },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const changes = [];
    const safeBody = req.body;
    const summary = (await getProductBatchSummaries([product.product_id], transaction)).get(Number(product.product_id));
    if (summary?.has_batches) {
      const submittedBatch = typeof safeBody.batch_no === 'string' ? safeBody.batch_no.trim() || null : safeBody.batch_no || null;
      const submittedExpiry = safeBody.expiry_date ? String(safeBody.expiry_date).slice(0, 10) : null;
      const inventoryChanged =
        (safeBody.stock_quantity !== undefined && Number(safeBody.stock_quantity) !== summary.stock_quantity) ||
        (safeBody.batch_no !== undefined && submittedBatch !== summary.batch_no) ||
        (safeBody.expiry_date !== undefined && submittedExpiry !== summary.expiry_date);
      if (inventoryChanged) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Stock, batch number, and expiry are managed by batch inventory.' });
      }
    }

    if (safeBody.stock_quantity !== undefined && String(product.stock_quantity) !== String(safeBody.stock_quantity))
      changes.push(`Stock changed from ${product.stock_quantity} to ${safeBody.stock_quantity}`);
    if (safeBody.unit_price !== undefined && String(product.unit_price) !== String(safeBody.unit_price))
      changes.push(`Price changed from ${product.unit_price} to ${safeBody.unit_price}`);
    if (safeBody.product_name && product.product_name !== safeBody.product_name)
      changes.push(`Name changed from "${product.product_name}" to "${safeBody.product_name}"`);

    const productFields = { ...safeBody };
    delete productFields.alternative_units;
    await product.update(productFields, { transaction });

    if (safeBody.alternative_units !== undefined && Array.isArray(safeBody.alternative_units)) {
      await product_units.destroy({ where: { product_id: product.product_id }, transaction });
      const baseCost = parseFloat(product.cost_price || safeBody.cost_price || 0);
      const altUnits = safeBody.alternative_units.map(item => {
        const factor = parseFloat(item.conversion_factor) || 1;
        const computedCost = item.cost_price ? parseFloat(item.cost_price) : (baseCost * factor);
        return {
          product_id: product.product_id,
          unit_id: parseInt(item.unit_id),
          conversion_factor: factor,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          cost_price: computedCost,
          barcode: item.barcode || null
        };
      });
      await product_units.bulkCreate(altUnits, { transaction });
    }

    if (!summary?.has_batches && Number(product.stock_quantity) > 0) {
      const batchNumber = typeof product.batch_no === 'string' && product.batch_no.trim()
        ? product.batch_no.trim()
        : `OPENING-${product.product_id}`;
      await batch_inventory.create({
        batch_number: batchNumber,
        product_id: product.product_id,
        purchase_order_id: null,
        supplier_id: null,
        purchase_price: Number(product.cost_price) || 0,
        received_quantity: Number(product.stock_quantity),
        remaining_quantity: Number(product.stock_quantity),
        received_date: getStoreLocalDate(),
        expiry_date: product.expiry_date || null,
        status: product.expiry_date && String(product.expiry_date).slice(0, 10) < getStoreLocalDate() ? 'Expired' : 'Active',
      }, { transaction });
      await syncProductFromBatches(product.product_id, transaction);
    }

    await product.reload({ transaction });
    await transaction.commit();
    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) { io.emit('alerts:updated'); io.emit('products:updated'); }
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_UPDATE',
      `Product ID ${product.product_id} ("${product.product_name}") updated.${changes.length ? ' ' + changes.join('. ') : ''}`, ip);
    res.status(200).json({ message: 'Product updated successfully', data: product });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
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
