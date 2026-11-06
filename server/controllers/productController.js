const { products, category, brands, units, batch_inventory, product_units } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../services/auditService');
const { syncAlertsForProduct } = require('../services/alertService');
const EXCLUDE = ['repair_quantity'];
const getIp   = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

// Helper to validate cross-table barcode uniqueness between products and product_units
async function validateBarcodes({ baseBarcode, altUnits = [], excludeProductId = null }) {
  const seenInPayload = new Map();

  const trimmedBase = typeof baseBarcode === 'string' ? baseBarcode.trim() : null;
  const cleanBase = trimmedBase ? trimmedBase : null;
  if (cleanBase) {
    seenInPayload.set(cleanBase, 'base product');
  }

  const cleanAltUnits = [];
  if (Array.isArray(altUnits)) {
    for (let i = 0; i < altUnits.length; i++) {
      const u = altUnits[i];
      const trimmedUnitBarcode = typeof u.barcode === 'string' ? u.barcode.trim() : null;
      const cleanUnitBarcode = trimmedUnitBarcode ? trimmedUnitBarcode : null;
      if (cleanUnitBarcode) {
        if (seenInPayload.has(cleanUnitBarcode)) {
          throw new Error(`Duplicate barcode "${cleanUnitBarcode}" within the same product submission.`);
        }
        seenInPayload.set(cleanUnitBarcode, `alternative unit (Unit ID: ${u.unit_id || i + 1})`);
      }
      cleanAltUnits.push({ ...u, barcode: cleanUnitBarcode });
    }
  }

  // Check database uniqueness against other products and units
  for (const [code, location] of seenInPayload.entries()) {
    // 1. Check products table
    const prodWhere = { barcode: code };
    if (excludeProductId) {
      prodWhere.product_id = { [Op.ne]: excludeProductId };
    }
    const conflictProd = await products.findOne({ where: prodWhere, attributes: ['product_id', 'product_name'] });
    if (conflictProd) {
      throw new Error(`Barcode "${code}" (${location}) is already used by product "${conflictProd.product_name}" (ID: ${conflictProd.product_id}).`);
    }

    // 2. Check product_units table
    const unitWhere = { barcode: code };
    if (excludeProductId) {
      unitWhere.product_id = { [Op.ne]: excludeProductId };
    }
    const conflictUnit = await product_units.findOne({
      where: unitWhere,
      attributes: ['product_unit_id', 'product_id'],
      include: [{ model: products, attributes: ['product_id', 'product_name'] }]
    });
    if (conflictUnit) {
      const ownerName = conflictUnit.product?.product_name || `ID ${conflictUnit.product_id}`;
      throw new Error(`Barcode "${code}" (${location}) is already used by alternative unit of product "${ownerName}" (ID: ${conflictUnit.product_id}).`);
    }
  }

  // If excludeProductId is set and cleanBase exists, but altUnits wasn't provided, ensure cleanBase doesn't match this product's own existing units
  if (excludeProductId && cleanBase && altUnits === undefined) {
    const ownUnitConflict = await product_units.findOne({
      where: { product_id: excludeProductId, barcode: cleanBase },
      attributes: ['product_unit_id', 'unit_id']
    });
    if (ownUnitConflict) {
      throw new Error(`Barcode "${cleanBase}" is already assigned to an alternative unit of this same product.`);
    }
  }

  return { cleanBase, cleanAltUnits };
}

exports.createProduct = async (req, res) => {
  const ip = getIp(req);
  try {
    const safeBody = req.body;

    // Validate barcodes
    const { cleanBase, cleanAltUnits } = await validateBarcodes({
      baseBarcode: safeBody.barcode,
      altUnits: safeBody.alternative_units || []
    });
    safeBody.barcode = cleanBase;

    const product = await products.create(safeBody);
    
    if (cleanAltUnits && cleanAltUnits.length > 0) {
      const baseCost = parseFloat(product.cost_price || safeBody.cost_price || 0);
      const altUnits = cleanAltUnits.map(item => {
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
      await product_units.bulkCreate(altUnits);
    }

    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) { io.emit('alerts:updated'); io.emit('products:updated'); }
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_ADD',
      `Product added: "${product.product_name}" (ID: ${product.product_id}), Stock: ${product.stock_quantity}, Price: ${product.unit_price}`, ip);
    res.status(201).json({ message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('createProduct error:', error.message);
    const isValidation = error.message && (error.message.includes('Barcode') || error.message.includes('Duplicate barcode'));
    res.status(isValidation ? 400 : 500).json({ error: error.message });
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

    const safeBody = req.body;

    // Barcode validation if barcode or alternative_units supplied
    let cleanAltUnits = undefined;
    if (safeBody.barcode !== undefined || safeBody.alternative_units !== undefined) {
      const result = await validateBarcodes({
        baseBarcode: safeBody.barcode !== undefined ? safeBody.barcode : product.barcode,
        altUnits: safeBody.alternative_units !== undefined ? safeBody.alternative_units : undefined,
        excludeProductId: product.product_id
      });
      if (safeBody.barcode !== undefined) {
        safeBody.barcode = result.cleanBase;
      }
      cleanAltUnits = result.cleanAltUnits;
    }

    const changes = [];
    if (safeBody.stock_quantity !== undefined && String(product.stock_quantity) !== String(safeBody.stock_quantity))
      changes.push(`Stock changed from ${product.stock_quantity} to ${safeBody.stock_quantity}`);
    if (safeBody.unit_price !== undefined && String(product.unit_price) !== String(safeBody.unit_price))
      changes.push(`Price changed from ${product.unit_price} to ${safeBody.unit_price}`);
    if (safeBody.product_name && product.product_name !== safeBody.product_name)
      changes.push(`Name changed from "${product.product_name}" to "${safeBody.product_name}"`);
    if (safeBody.barcode !== undefined && product.barcode !== safeBody.barcode)
      changes.push(`Barcode changed to "${safeBody.barcode}"`);

    await product.update(safeBody);
    await product.reload();

    if (cleanAltUnits !== undefined) {
      await product_units.destroy({ where: { product_id: product.product_id } });
      const baseCost = parseFloat(product.cost_price || safeBody.cost_price || 0);
      const altUnits = cleanAltUnits.map(item => {
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
      if (altUnits.length > 0) {
        await product_units.bulkCreate(altUnits);
      }
    }

    await syncAlertsForProduct(product);
    const io = req.app.get('io');
    if (io) { io.emit('alerts:updated'); io.emit('products:updated'); }
    await logActivity(req.user?.user_id, req.user?.role, 'INVENTORY_UPDATE',
      `Product ID ${product.product_id} ("${product.product_name}") updated.${changes.length ? ' ' + changes.join('. ') : ''}`, ip);
    res.status(200).json({ message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('updateProduct error:', error.message);
    const isValidation = error.message && (error.message.includes('Barcode') || error.message.includes('Duplicate barcode'));
    res.status(isValidation ? 400 : 500).json({ error: error.message });
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

exports.lookupByBarcode = async (req, res) => {
  const ip = getIp(req);
  try {
    const rawCode = req.params.code;
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';
    if (!code) {
      return res.status(400).json({ message: 'Barcode is required' });
    }

    // 1. Search products.barcode first (exact match)
    const baseProduct = await products.findOne({
      where: { barcode: code },
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
      ]
    });

    if (baseProduct) {
      const plain = baseProduct.toJSON();
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

      const responsePayload = {
        product: plain,
        match_type: 'BASE_PRODUCT',
        matched_unit: {
          unit_id: plain.unit_id,
          unit_name: plain.unit?.unit_name || 'Base Unit',
          conversion_factor: 1,
          unit_price: parseFloat(plain.unit_price),
          is_base: true,
          barcode: plain.barcode
        }
      };

      await logActivity(
        req.user?.user_id || 1,
        req.user?.role || 'Cashier',
        'BARCODE_SCAN',
        `Barcode scanned: "${code}" matched base product "${plain.product_name}" (ID: ${plain.product_id})`,
        ip
      );

      return res.status(200).json(responsePayload);
    }

    // 2. Search product_units.barcode second (exact match)
    const altUnit = await product_units.findOne({
      where: { barcode: code },
      include: [
        { model: units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] },
        {
          model: products,
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
          ]
        }
      ]
    });

    if (altUnit && altUnit.product) {
      const plain = altUnit.product.toJSON();
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

      const convFactor = parseFloat(altUnit.conversion_factor) || 1;
      const unitPrice = altUnit.unit_price !== null && altUnit.unit_price !== undefined
        ? parseFloat(altUnit.unit_price)
        : (parseFloat(plain.unit_price) * convFactor);

      const responsePayload = {
        product: plain,
        match_type: 'ALTERNATIVE_UNIT',
        matched_unit: {
          product_unit_id: altUnit.product_unit_id,
          unit_id: altUnit.unit_id,
          unit_name: altUnit.unit_details?.unit_name || 'Alternate Unit',
          conversion_factor: convFactor,
          unit_price: unitPrice,
          is_base: false,
          barcode: altUnit.barcode
        }
      };

      await logActivity(
        req.user?.user_id || 1,
        req.user?.role || 'Cashier',
        'BARCODE_SCAN',
        `Barcode scanned: "${code}" matched alternate unit (${altUnit.unit_details?.unit_name}) of product "${plain.product_name}" (ID: ${plain.product_id})`,
        ip
      );

      return res.status(200).json(responsePayload);
    }

    // 3. Not found
    return res.status(404).json({
      message: `Product with barcode "${code}" not found.`
    });
  } catch (error) {
    console.error('lookupByBarcode error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.attachBarcode = async (req, res) => {
  const ip = getIp(req);
  try {
    const productId = req.params.id;
    const { barcode, unit_id, conversion_factor, unit_price } = req.body;
    const cleanBarcode = typeof barcode === 'string' ? barcode.trim() : '';

    if (!cleanBarcode) {
      return res.status(400).json({ message: 'Barcode is required' });
    }

    const product = await products.findByPk(productId, {
      include: [
        { model: units, attributes: ['unit_id', 'unit_name'] },
        {
          model: product_units,
          as: 'alternative_units',
          include: [{ model: units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] }]
        }
      ]
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check for duplicate barcode anywhere in products or product_units
    const conflictProd = await products.findOne({
      where: { barcode: cleanBarcode, product_id: { [Op.ne]: product.product_id } },
      attributes: ['product_id', 'product_name']
    });
    if (conflictProd) {
      return res.status(400).json({
        message: `Barcode "${cleanBarcode}" is already used by product "${conflictProd.product_name}" (ID: ${conflictProd.product_id}).`
      });
    }

    const conflictUnit = await product_units.findOne({
      where: { barcode: cleanBarcode, product_id: { [Op.ne]: product.product_id } },
      attributes: ['product_unit_id', 'product_id'],
      include: [{ model: products, attributes: ['product_id', 'product_name'] }]
    });
    if (conflictUnit) {
      const ownerName = conflictUnit.product?.product_name || `ID ${conflictUnit.product_id}`;
      return res.status(400).json({
        message: `Barcode "${cleanBarcode}" is already used by an alternative unit of product "${ownerName}" (ID: ${conflictUnit.product_id}).`
      });
    }

    const targetUnitId = unit_id ? parseInt(unit_id) : product.unit_id;
    let targetDesc = '';

    if (targetUnitId === product.unit_id) {
      // Attaching to base product
      const ownUnitConflict = await product_units.findOne({
        where: { product_id: product.product_id, barcode: cleanBarcode }
      });
      if (ownUnitConflict) {
        return res.status(400).json({
          message: `Barcode "${cleanBarcode}" is already assigned to an alternative unit of this product.`
        });
      }
      await product.update({ barcode: cleanBarcode });
      targetDesc = `base product (Unit: ${product.unit?.unit_name || 'Base'})`;
    } else {
      // Attaching to alternative unit
      if (product.barcode === cleanBarcode) {
        return res.status(400).json({
          message: `Barcode "${cleanBarcode}" is already assigned to the base product.`
        });
      }
      let existingAlt = await product_units.findOne({
        where: { product_id: product.product_id, unit_id: targetUnitId }
      });
      if (existingAlt) {
        await existingAlt.update({ barcode: cleanBarcode });
      } else {
        await product_units.create({
          product_id: product.product_id,
          unit_id: targetUnitId,
          conversion_factor: conversion_factor || 1,
          unit_price: unit_price || null,
          barcode: cleanBarcode
        });
      }
      targetDesc = `alternative unit (Unit ID: ${targetUnitId})`;
    }

    await logActivity(
      req.user?.user_id || 1,
      req.user?.role || 'Admin',
      'BARCODE_ATTACH',
      `Attached barcode "${cleanBarcode}" to ${targetDesc} of product "${product.product_name}" (ID: ${product.product_id})`,
      ip
    );

    const io = req.app.get('io');
    if (io) { io.emit('products:updated'); }

    // Re-fetch updated product with full details
    const updated = await products.findByPk(product.product_id, {
      attributes: { exclude: EXCLUDE },
      include: [
        { model: category, attributes: ['category_id', 'category_name'] },
        { model: brands, attributes: ['brand_id', 'brand_name'] },
        { model: units, attributes: ['unit_id', 'unit_name'] },
        {
          model: product_units,
          as: 'alternative_units',
          include: [{ model: units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] }]
        }
      ]
    });

    return res.status(200).json({
      message: `Barcode "${cleanBarcode}" successfully attached to "${product.product_name}".`,
      data: updated
    });
  } catch (error) {
    console.error('attachBarcode error:', error);
    res.status(500).json({ error: error.message });
  }
};
