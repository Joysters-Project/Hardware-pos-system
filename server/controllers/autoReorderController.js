const { auto_reorder_suggestions, products, suppliers, purchase_orders, po_items, sequelize } = require('../models');
const reorderService = require('../services/autoReorderService');
const { logActivity } = require('../services/auditService');
const { Op } = require('sequelize');

/**
 * getSuggestions
 * GET /api/procurement/reorder/suggestions
 * Returns all suggestions for products whose stock is STILL below reorder_level.
 * Also auto-generates a fresh Pending suggestion for any product that has
 * stock < reorder_level but no active (Pending/Approved) suggestion yet
 * (e.g., the previous one was Converted, Rejected, or Dismissed).
 */
exports.getSuggestions = async (req, res) => {
  try {
    // Step 1: Auto-generate missing Pending suggestions for low-stock products
    // that only have Converted/Rejected/Dismissed records (or none at all).
    try {
      const lowStockProducts = await products.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            { stock_quantity: { [Op.lte]: 0 } },
            { stock_quantity: { [Op.lt]: sequelize.col('reorder_level') } },
            { stock_quantity: { [Op.lt]: sequelize.col('min_stock_quantity') } }
          ]
        }
      });

      for (const prod of lowStockProducts) {
        // Check whether an active (Pending/Approved) suggestion already exists
        const activeSuggestion = await auto_reorder_suggestions.findOne({
          where: {
            product_id: prod.product_id,
            status: { [Op.in]: ['Pending', 'Approved'] }
          }
        });
        if (!activeSuggestion) {
          // Generate a new one (silently — don't block the response if this fails)
          await reorderService.checkProductReorder(prod.product_id).catch(err =>
            console.warn(`[AutoReorderController] getSuggestions auto-generate failed for product ${prod.product_id}: ${err.message}`)
          );
        }
      }
    } catch (scanErr) {
      console.warn(`[AutoReorderController] getSuggestions auto-scan failed: ${scanErr.message}`);
    }

    // Step 2: Fetch all suggestions (all statuses) with product & supplier info
    const list = await auto_reorder_suggestions.findAll({
      include: [
        { model: products, attributes: ['product_id', 'product_name', 'cost_price', 'stock_quantity', 'reorder_level'] },
        { model: suppliers, attributes: ['supplier_id', 'supplier_name', 'phone', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Step 3: Filter out stale suggestions in real-time:
    // A suggestion is stale if the product's current stock_quantity >= reorder_level
    // (stock was replenished after the suggestion was created but before the next scan ran)
    const validList = list.filter(s => {
      if (!s.product) return false; // product deleted — hide it
      const stock = parseFloat(s.product.stock_quantity || 0);
      const reorderLevel = parseFloat(s.product.reorder_level || 0);
      const minStock = parseFloat(s.product.min_stock_quantity || 0);
      const threshold = Math.max(reorderLevel, minStock);
      return stock <= 0 || (threshold > 0 && stock < threshold);
    });

    res.json(validList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * approveSuggestion
 * PUT /api/procurement/reorder/suggestions/:id/approve
 */
exports.approveSuggestion = async (req, res) => {
  try {
    const suggestion = await auto_reorder_suggestions.findByPk(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    await suggestion.update({ status: 'Approved' });
    res.json({ message: 'Suggestion approved successfully', suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * rejectSuggestion
 * PUT /api/procurement/reorder/suggestions/:id/reject
 */
exports.rejectSuggestion = async (req, res) => {
  try {
    const suggestion = await auto_reorder_suggestions.findByPk(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    await suggestion.update({ status: 'Rejected' });
    res.json({ message: 'Suggestion rejected successfully', suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * convertToPO
 * POST /api/procurement/reorder/suggestions/:id/convert
 */
exports.convertToPO = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const suggestion = await auto_reorder_suggestions.findByPk(req.params.id, {
      include: [products, suppliers],
      transaction
    });

    if (!suggestion) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status === 'Converted') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Suggestion has already been converted to a PO' });
    }

    // 1. Generate PO Number (numeric only)
    const maxId = (await purchase_orders.max('po_id', { transaction })) || 0;
    const poNumber = String(maxId + 1).padStart(4, '0');

    // 2. Create the Purchase Order
    const po = await purchase_orders.create({
      po_number: poNumber,
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days expected
      status: 'Pending',
      total_amount: suggestion.estimated_cost,
      created_by: req.user?.user_id || null,
      supplier_id: suggestion.supplier_id,
      notes: `Generated automatically from Auto-Reorder Suggestion #${suggestion.suggestion_id}`
    }, { transaction });

    // 3. Create PO Line Item
    await po_items.create({
      po_id: po.po_id,
      product_id: suggestion.product_id,
      quantity: suggestion.suggested_quantity,
      unit_price: suggestion.products?.cost_price || 0.00,
      total_price: suggestion.estimated_cost
    }, { transaction });

    // 4. Update Suggestion
    await suggestion.update({
      status: 'Converted',
      converted_po_id: po.po_id
    }, { transaction });

    await transaction.commit();

    // Log to Audit Log
    logActivity(
      req.user?.user_id,
      req.user?.role,
      'CONVERT_REORDER_SUGGESTION',
      `Converted reorder suggestion #${suggestion.suggestion_id} to PO ${poNumber} for product_id=${suggestion.product_id}`
    ).catch(err => console.error(`[AutoReorderController] Audit failed: ${err.message}`));

    res.json({
      message: 'Converted reorder suggestion to Purchase Order successfully',
      po_id: po.po_id,
      po_number: poNumber,
      suggestion
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

/**
 * triggerCheck
 * POST /api/procurement/reorder/trigger
 */
exports.triggerCheck = async (req, res) => {
  try {
    const suggestionsCreatedCount = await reorderService.checkAndGenerateSuggestions();
    res.json({
      message: 'Auto-reorder scanner completed successfully',
      suggestions_created: suggestionsCreatedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * dismissStale
 * POST /api/procurement/reorder/dismiss-stale
 * Manually dismisses suggestions whose product stock is now >= reorder_level.
 */
exports.dismissStale = async (req, res) => {
  try {
    const dismissed = await reorderService.dismissStaleSuggestions();
    res.json({
      message: 'Stale suggestions dismissed successfully',
      dismissed_count: dismissed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
