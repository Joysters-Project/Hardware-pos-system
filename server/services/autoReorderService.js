const { products, suppliers, auto_reorder_suggestions, po_items, purchase_orders } = require('../models');
const notificationService = require('./procurementNotificationService');
const { Op } = require('sequelize');

/**
 * suggestSupplierForProduct
 * Resolves the best supplier for a product (preferred → historical → first active).
 */
const suggestSupplierForProduct = async (product) => {
  if (product.preferred_supplier_id) {
    const supp = await suppliers.findByPk(product.preferred_supplier_id);
    if (supp && supp.status === 'Active') return supp;
  }

  // Look at purchase history
  try {
    const lastPurchase = await po_items.findOne({
      where: { product_id: product.product_id },
      include: [{
        model: purchase_orders,
        where: { status: 'Received' },
        include: [suppliers]
      }],
      order: [['id', 'DESC']]
    });

    if (lastPurchase && lastPurchase.purchase_order?.supplier?.status === 'Active') {
      return lastPurchase.purchase_order.supplier;
    }
  } catch (err) {
    console.warn(`[AutoReorderService] Error querying order history: ${err.message}`);
  }

  // Fallback: first active supplier
  return await suppliers.findOne({ where: { status: 'Active' } });
};

/**
 * checkProductReorder
 * Checks a single product and generates a suggestion if stock is low.
 */
const checkProductReorder = async (productId) => {
  try {
    const product = await products.findByPk(productId);
    if (!product || product.status !== 'active') return null;

    const currentStock = parseFloat(product.stock_quantity || 0);
    const reorderLevel = parseFloat(product.reorder_level || 0);
    const minStock = parseFloat(product.min_stock_quantity || 0);
    const threshold = Math.max(reorderLevel, minStock);

    if (threshold > 0 && currentStock >= threshold) return null;
    if (threshold === 0 && currentStock > 0) return null;

    // Check if there's already an active suggestion (Pending or Approved)
    const existing = await auto_reorder_suggestions.findOne({
      where: {
        product_id: productId,
        status: { [Op.in]: ['Pending', 'Approved'] }
      }
    });
    if (existing) return existing;

    // Resolve supplier
    const supplier = await suggestSupplierForProduct(product);
    if (!supplier) {
      console.warn(`[AutoReorderService] No active suppliers available for product ${product.product_name}. Skipping suggestion.`);
      return null;
    }

    const effectiveThreshold = threshold > 0 ? threshold : 10;
    const suggestedQty = product.reorder_quantity > 0 
      ? product.reorder_quantity 
      : Math.max(10, effectiveThreshold * 2);
    
    const cost = parseFloat((suggestedQty * Number(product.cost_price)).toFixed(2));

    const suggestion = await auto_reorder_suggestions.create({
      product_id: productId,
      supplier_id: supplier.supplier_id,
      current_stock: product.stock_quantity,
      reorder_level: product.reorder_level,
      suggested_quantity: suggestedQty,
      estimated_cost: cost,
      status: 'Pending'
    });

    const severity = product.stock_quantity === 0 ? 'critical' : 'warning';

    // Create Notification
    await notificationService.createNotification(
      'AUTO_REORDER',
      `Auto-Reorder Suggestion: ${product.product_name}`,
      `Stock level is low (${product.stock_quantity}/${product.reorder_level}). Suggested reorder of ${suggestedQty} units from ${supplier.supplier_name}.`,
      'product',
      product.product_id,
      severity
    );

    return suggestion;
  } catch (err) {
    console.error(`[AutoReorderService] Error checking reorder for product ${productId}: ${err.message}`);
    throw err;
  }
};

/**
 * dismissStaleSuggestions
 * Auto-dismisses Pending/Approved suggestions whose product stock is now
 * at or above the reorder level (stock was replenished since suggestion was created).
 */
const dismissStaleSuggestions = async () => {
  try {
    // Find all Pending/Approved suggestions
    const activeSuggestions = await auto_reorder_suggestions.findAll({
      where: { status: { [Op.in]: ['Pending', 'Approved'] } },
      include: [{ model: products, attributes: ['product_id', 'stock_quantity', 'reorder_level', 'status'] }]
    });

    let dismissed = 0;
    for (const s of activeSuggestions) {
      const prod = s.product;
      // Dismiss if product is inactive, or stock is now >= reorder_level
      const currentStock = parseFloat(prod?.stock_quantity || 0);
      const reorderLvl = parseFloat(prod?.reorder_level || 0);
      const minStock = parseFloat(prod?.min_stock_quantity || 0);
      const threshold = Math.max(reorderLvl, minStock);

      const isStale = (threshold > 0 && currentStock >= threshold) || (threshold === 0 && currentStock > 0);
      if (!prod || prod.status !== 'active' || isStale) {
        await s.update({ status: 'Dismissed' });
        dismissed++;
        console.log(`[AutoReorderService] Dismissed stale suggestion #${s.suggestion_id} for product_id=${s.product_id} (stock=${prod?.stock_quantity}, threshold=${threshold})`);
      }
    }
    return dismissed;
  } catch (err) {
    console.error(`[AutoReorderService] Error dismissing stale suggestions: ${err.message}`);
    // Don't throw — this is a housekeeping step; failures should not block new suggestions
    return 0;
  }
};

/**
 * checkAndGenerateSuggestions
 * Scans all products and generates suggestions for low stock.
 * Also dismisses stale suggestions for products that have been restocked.
 */
const checkAndGenerateSuggestions = async () => {
  try {
    // Step 1: Dismiss suggestions that are no longer valid (stock replenished)
    await dismissStaleSuggestions();

    // Step 2: Find currently low-stock products
    const lowStockProducts = await products.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { stock_quantity: { [Op.lte]: 0 } },
          { stock_quantity: { [Op.lt]: products.sequelize.col('reorder_level') } },
          { stock_quantity: { [Op.lt]: products.sequelize.col('min_stock_quantity') } }
        ]
      }
    });

    let count = 0;
    for (const prod of lowStockProducts) {
      const suggestion = await checkProductReorder(prod.product_id);
      if (suggestion) count++;
    }
    return count;
  } catch (err) {
    console.error(`[AutoReorderService] Error generating suggestions: ${err.message}`);
    throw err;
  }
};

module.exports = {
  checkProductReorder,
  checkAndGenerateSuggestions,
  dismissStaleSuggestions
};
