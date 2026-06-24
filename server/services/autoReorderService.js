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

    if (product.stock_quantity >= product.reorder_level) return null;

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

    const suggestedQty = product.reorder_quantity > 0 
      ? product.reorder_quantity 
      : Math.max(10, product.reorder_level * 2);
    
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
 * checkAndGenerateSuggestions
 * Scans all products and generates suggestions for low stock.
 */
const checkAndGenerateSuggestions = async () => {
  try {
    const lowStockProducts = await products.findAll({
      where: {
        status: 'active',
        stock_quantity: {
          [Op.lt]: products.sequelize.col('reorder_level')
        }
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
  checkAndGenerateSuggestions
};
