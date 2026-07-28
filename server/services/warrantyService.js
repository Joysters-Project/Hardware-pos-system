const { product_warranties, products } = require('../models');
const { Op } = require('sequelize');

class WarrantyService {
  /**
   * Check warranty status for a product
   */
  static async checkWarranty(productId, warrantyCardNo = null, billDate = null) {
    const product = await products.findByPk(productId);
    if (!product) {
      throw new Error(`Product ID ${productId} not found`);
    }

    const whereClause = { product_id: productId };
    if (warrantyCardNo) {
      whereClause.warranty_card_no = warrantyCardNo;
    }

    const warranty = await product_warranties.findOne({
      where: whereClause,
      order: [['warranty_end', 'DESC']]
    });

    const now = new Date();
    
    if (!warranty) {
      return {
        has_warranty: false,
        status: 'NO_WARRANTY',
        warranty_card_no: warrantyCardNo || null,
        warranty_start: null,
        warranty_end: null,
        is_active: false,
        days_remaining: 0
      };
    }

    let startDate = warranty.warranty_start ? new Date(warranty.warranty_start) : (billDate ? new Date(billDate) : null);
    let endDate = warranty.warranty_end ? new Date(warranty.warranty_end) : null;

    if (!endDate && startDate && warranty.warranty_period) {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + Number(warranty.warranty_period));
    }

    if (!endDate) {
      return {
        has_warranty: false,
        status: 'NO_WARRANTY',
        warranty_card_no: warranty.warranty_card_no || warrantyCardNo || null,
        warranty_start: startDate ? startDate.toISOString().split('T')[0] : null,
        warranty_end: null,
        is_active: false,
        days_remaining: 0
      };
    }

    const isActive = now <= endDate;
    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      has_warranty: true,
      warranty_id: warranty.id,
      warranty_card_no: warranty.warranty_card_no,
      warranty_period: warranty.warranty_period,
      warranty_start: startDate ? startDate.toISOString().split('T')[0] : null,
      warranty_end: endDate.toISOString().split('T')[0],
      is_active: isActive,
      status: isActive ? 'ACTIVE' : 'EXPIRED',
      days_remaining: isActive ? Math.max(0, daysRemaining) : 0
    };
  }

  /**
   * Calculate customer payment for repair based on warranty and discount formula
   * customerPayment = max(0, repairCost - (repairCost * discountPercentage / 100))
   */
  static calculateCustomerPayment(repairCost, discountPercentage = 0, isWarrantyActive = false) {
    const cost = parseFloat(repairCost) || 0;
    const discount = parseFloat(discountPercentage) || 0;

    if (isWarrantyActive && discount === 0) {
      // 100% covered under active warranty
      return {
        repair_cost: cost,
        discount_percentage: 100,
        customer_payment: 0.00
      };
    }

    const effectiveDiscount = isWarrantyActive ? Math.max(discount, 100) : Math.min(100, Math.max(0, discount));
    const discountAmount = cost * (effectiveDiscount / 100);
    const finalPayment = Math.max(0, cost - discountAmount);

    return {
      repair_cost: parseFloat(cost.toFixed(2)),
      discount_percentage: parseFloat(effectiveDiscount.toFixed(2)),
      customer_payment: parseFloat(finalPayment.toFixed(2))
    };
  }

  /**
   * Create or update product warranty record
   */
  static async setProductWarranty(productId, data) {
    const { warranty_card_no, warranty_period, warranty_start, warranty_end } = data;
    
    let end_date = warranty_end;
    if (!end_date && warranty_start && warranty_period) {
      const start = new Date(warranty_start);
      start.setMonth(start.getMonth() + Number(warranty_period));
      end_date = start.toISOString().split('T')[0];
    }

    const [warrantyRecord] = await product_warranties.upsert({
      product_id: productId,
      warranty_card_no,
      warranty_period,
      warranty_start,
      warranty_end: end_date
    });

    return warrantyRecord;
  }
}

module.exports = WarrantyService;
