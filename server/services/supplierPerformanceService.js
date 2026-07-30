const { suppliers, purchase_orders } = require('../models');

/**
 * calculateSupplierScore
 * Computes supplier KPI performance metrics and assigns tier.
 */
const calculateSupplierScore = async (supplierId) => {
  try {
    const supplier = await suppliers.findByPk(supplierId);
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    const orders = await purchase_orders.findAll({
      where: { supplier_id: supplierId }
    });

    if (orders.length === 0) {
      // Default metrics for new suppliers
      await supplier.update({
        performance_score: 80.00, // standard starting score
        performance_tier: 'Silver',
        on_time_delivery_pct: 100.00,
        avg_delay_days: 0.00,
        order_success_rate: 100.00,
        total_purchase_volume: 0.00
      });
      return supplier;
    }

    const receivedOrders = orders.filter(o => o.status === 'Received');
    const activeOrCompletedOrders = orders.filter(o => o.status !== 'Cancelled');

    // 1. Order Success Rate
    let orderSuccessRate = 100.00;
    if (activeOrCompletedOrders.length > 0) {
      orderSuccessRate = (receivedOrders.length / activeOrCompletedOrders.length) * 100;
    }

    // 2. On-Time Delivery % & Delay Days
    let onTimeCount = 0;
    let totalDelayDays = 0;
    let evaluatedDeliveries = 0;

    receivedOrders.forEach(o => {
      if (o.expected_delivery) {
        evaluatedDeliveries++;
        const expected = new Date(o.expected_delivery);
        const actual = o.actual_delivery_date ? new Date(o.actual_delivery_date) : new Date(o.po_date); // fallback
        
        const diffTime = actual.getTime() - expected.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          onTimeCount++;
        } else {
          totalDelayDays += diffDays;
        }
      }
    });

    const onTimeDeliveryPct = evaluatedDeliveries > 0 ? (onTimeCount / evaluatedDeliveries) * 100 : 100.00;
    const avgDelayDays = evaluatedDeliveries > 0 ? (totalDelayDays / evaluatedDeliveries) : 0.00;

    // 3. Purchase Volume
    const totalPurchaseVolume = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    // Scoring components (0-100 scales)
    const onTimeScore = onTimeDeliveryPct;
    const delayScore = Math.max(0, 100 - (avgDelayDays * 10)); // 10 points deducted per day of delay
    const successScore = orderSuccessRate;
    const volumeScore = Math.min(100, (totalPurchaseVolume / 1000000) * 100); // 1,000,000 LKR = 100 points
    const ratingScore = (supplier.performance_rating || 4) * 20; // Star rating out of 5

    // Total weighted score
    // weights: onTime (40%), delay (25%), success (20%), volume (10%), rating (5%)
    const finalScore = (onTimeScore * 0.40) + 
                       (delayScore * 0.25) + 
                       (successScore * 0.20) + 
                       (volumeScore * 0.10) + 
                       (ratingScore * 0.05);

    // Determine performance tier
    let tier = 'Bronze';
    if (finalScore >= 80) tier = 'Gold';
    else if (finalScore >= 50) tier = 'Silver';

    // Update supplier record
    await supplier.update({
      performance_score: parseFloat(finalScore.toFixed(2)),
      performance_tier: tier,
      on_time_delivery_pct: parseFloat(onTimeDeliveryPct.toFixed(2)),
      avg_delay_days: parseFloat(avgDelayDays.toFixed(2)),
      order_success_rate: parseFloat(orderSuccessRate.toFixed(2)),
      total_purchase_volume: parseFloat(totalPurchaseVolume.toFixed(2))
    });

    return supplier;
  } catch (err) {
    console.error(`[SupplierPerformanceService] Error calculating supplier score: ${err.message}`);
    throw err;
  }
};

/**
 * recalculateAllSuppliers
 * Runs through all suppliers and recalculates their performance scores.
 */
const recalculateAllSuppliers = async () => {
  try {
    const list = await suppliers.findAll();
    let updatedCount = 0;
    for (const supplier of list) {
      await calculateSupplierScore(supplier.supplier_id);
      updatedCount++;
    }
    return updatedCount;
  } catch (err) {
    console.error(`[SupplierPerformanceService] Error recalculating all suppliers: ${err.message}`);
    throw err;
  }
};

module.exports = {
  calculateSupplierScore,
  recalculateAllSuppliers
};
