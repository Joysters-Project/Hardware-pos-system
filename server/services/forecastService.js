const { products, bill_items, bills } = require('../models');
const { Op } = require('sequelize');

/**
 * getProductForecast
 * Calculates forecast metrics for a single product and caches avg_daily_sales.
 */
const getProductForecast = async (productId) => {
  try {
    const product = await products.findByPk(productId);
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find all sales of this product in the last 30 days
    const sales = await bill_items.findAll({
      where: { product_id: productId },
      include: [{
        model: bills,
        where: {
          bill_date: { [Op.gte]: thirtyDaysAgo }
        }
      }]
    });

    const totalQtySold = sales.reduce((sum, item) => sum + Number(item.quantity), 0);
    const avgDailySales = parseFloat((totalQtySold / 30).toFixed(4));

    // Update cached average daily sales in product table
    await product.update({ avg_daily_sales: avgDailySales });

    let daysRemaining = Infinity;
    let stockoutDate = null;
    let severity = 'Safe';

    if (avgDailySales > 0) {
      daysRemaining = parseFloat((product.stock_quantity / avgDailySales).toFixed(2));
      
      const msRemaining = daysRemaining * 24 * 60 * 60 * 1000;
      stockoutDate = new Date(Date.now() + msRemaining).toISOString().split('T')[0];

      if (daysRemaining <= 7) {
        severity = 'Critical';
      } else if (daysRemaining <= 14) {
        severity = 'Low';
      }
    }

    return {
      product_id: product.product_id,
      product_name: product.product_name,
      stock_quantity: product.stock_quantity,
      avg_daily_sales: avgDailySales,
      days_remaining: daysRemaining,
      severity,
      stockout_date: stockoutDate
    };
  } catch (err) {
    console.error(`[ForecastService] Error calculating forecast for product ${productId}: ${err.message}`);
    throw err;
  }
};

/**
 * calculateForecasts
 * Calculates forecasts for all active products.
 */
const calculateForecasts = async () => {
  try {
    const activeProducts = await products.findAll({
      where: { status: 'active' }
    });

    const forecasts = [];
    for (const prod of activeProducts) {
      const forecast = await getProductForecast(prod.product_id);
      forecasts.push(forecast);
    }

    // Sort by urgency: Critical first, then Low, then Safe, then by days remaining ascending
    forecasts.sort((a, b) => {
      const severityWeight = { 'Critical': 1, 'Low': 2, 'Safe': 3 };
      if (severityWeight[a.severity] !== severityWeight[b.severity]) {
        return severityWeight[a.severity] - severityWeight[b.severity];
      }
      return a.days_remaining - b.days_remaining;
    });

    return forecasts;
  } catch (err) {
    console.error(`[ForecastService] Error batch calculating forecasts: ${err.message}`);
    throw err;
  }
};

module.exports = {
  getProductForecast,
  calculateForecasts
};
