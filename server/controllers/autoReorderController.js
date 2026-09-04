const { auto_reorder_suggestions, products, suppliers, purchase_orders, po_items, sequelize } = require('../models');
const reorderService = require('../services/autoReorderService');
const { logActivity } = require('../services/auditService');

/**
 * getSuggestions
 * GET /api/procurement/reorder/suggestions
 */
exports.getSuggestions = async (req, res) => {
  try {
    const list = await auto_reorder_suggestions.findAll({
      include: [
        { model: products, attributes: ['product_id', 'product_name', 'cost_price', 'stock_quantity', 'reorder_level'] },
        { model: suppliers, attributes: ['supplier_id', 'supplier_name', 'phone', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(list);
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
