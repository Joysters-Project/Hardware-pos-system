const { Op } = require('sequelize');
const {
  bills,
  bill_items,
  returns,
  return_items,
  payments,
  products,
  suppliers,
  supplier_returns,
  supplier_services,
  inventory_statuses,
  product_warranties,
  audit_log,
  sequelize
} = require('../models');
const WarrantyService = require('./warrantyService');

class ReturnService {
  static async processReturn(returnData, userId, userRole) {
    const bill_id = Number(returnData.bill_id);
    const items = returnData.items; // Array of return items
    const customer_id = returnData.customer_id ? Number(returnData.customer_id) : null;
    const return_type = returnData.return_type || 'REFUND';
    const reason = returnData.reason || returnData.return_reason || 'Customer Return';
    const supplier_id = returnData.supplier_id ? Number(returnData.supplier_id) : null;
    const po_id = returnData.po_id ? Number(returnData.po_id) : null;

    if (!bill_id || !Array.isArray(items) || items.length === 0) {
      throw new Error('bill_id and items array are required');
    }

    const validActions = ['REFUND', 'REPAIR', 'EXCHANGE', 'SUPPLIER_RETURN', 'SCRAP', 'OTHER'];
    const validConditions = ['GOOD', 'DEFECTIVE', 'DAMAGED'];

    return await sequelize.transaction(async (t) => {
      const bill = await bills.findByPk(bill_id, { transaction: t });
      if (!bill) {
        throw new Error('Bill not found');
      }

      const effectiveCustomerId = customer_id || bill.customer_id || null;

      let total_refund_amount = 0;
      let hasSupplierAction = false;

      // Validate each item
      for (const item of items) {
        const product_id = Number(item.product_id);
        const return_quantity = Number(item.return_quantity || item.quantity || 1);
        const action = String(item.action || item.destination || 'REFUND').toUpperCase();
        const condition = String(item.condition || 'DEFECTIVE').toUpperCase();

        if (!validActions.includes(action)) {
          throw new Error(`Invalid action: ${action}`);
        }
        if (!validConditions.includes(condition)) {
          throw new Error(`Invalid condition: ${condition}`);
        }
        if (['SCRAP', 'SUPPLIER_RETURN', 'OTHER'].includes(action) && !['Manager', 'Admin'].includes(userRole)) {
          throw new Error('Action requires Manager or Admin role');
        }
        const rawDest = String(item.destination || item.stock_movement_override || '').toUpperCase();
        if (['SUPPLIER_RETURN', 'REPAIR', 'EXCHANGE'].includes(action) || ['SUPPLIER', 'REPAIR', 'SUPPLIER_CLAIM', 'SUPPLIER_EXCHANGE', 'SUPPLIER_REPAIR'].includes(rawDest)) {
          hasSupplierAction = true;
        }

        const billItem = await bill_items.findOne({ where: { bill_id, product_id }, transaction: t });
        if (!billItem) {
          throw new Error(`Bill item not found for product ${product_id}`);
        }

        if (return_quantity > billItem.quantity) {
          throw new Error(`Return quantity exceeds billed quantity for product ${product_id}`);
        }

        // Calculate refund amount if action is REFUND
        if (action === 'REFUND') {
          const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
          const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * return_quantity).toFixed(2));
          item.calculated_refund = refund_amount;
          total_refund_amount += refund_amount;
        } else {
          item.calculated_refund = 0;
        }
      }

      if (hasSupplierAction && !supplier_id) {
        throw new Error('Selecting a supplier is mandatory when returning products to a supplier');
      }

      // Calculate cash refund to customer
      const original_balance_due = parseFloat(bill.balance_due) || 0;
      let actual_cash_refund = 0;
      if (total_refund_amount > 0) {
        if (original_balance_due > 0) {
          if (total_refund_amount <= original_balance_due) {
            actual_cash_refund = 0;
          } else {
            actual_cash_refund = total_refund_amount - original_balance_due;
          }
        } else {
          const totalPaid = await payments.sum('amount_paid', { where: { bill_id }, transaction: t }) || 0;
          actual_cash_refund = Math.min(total_refund_amount, Math.max(0, Number(totalPaid)));
        }
      }

      // Create Returns Header
      const newReturn = await returns.create({
        bill_id,
        customer_id: effectiveCustomerId,
        return_date: new Date(),
        return_type: return_type,
        status: hasSupplierAction ? 'SENT_TO_SUPPLIER' : 'COMPLETED',
        reason: reason,
        total_refund_amount: actual_cash_refund,
        processed_by: userId,
        po_id,
        supplier_id
      }, { transaction: t });

      // Process each return item
      for (const item of items) {
        const product_id = Number(item.product_id);
        const return_quantity = Number(item.return_quantity || item.quantity || 1);
        const refund_amount = item.calculated_refund || 0;
        const action = String(item.action || 'REFUND').toUpperCase();
        const condition = String(item.condition || 'DEFECTIVE').toUpperCase();
        const itemReason = item.return_reason || reason || 'Customer Return';
        const rawDest = String(item.destination || item.stock_movement_override || '').toUpperCase();
        let destination = 'REPAIR';
        if (['SUPPLIER', 'SUPPLIER_CLAIM', 'SUPPLIER_EXCHANGE'].includes(rawDest) || action === 'SUPPLIER_RETURN') {
          destination = 'SUPPLIER';
        } else if (['STOCK', 'INCREASE_STOCK'].includes(rawDest) || action === 'REFUND') {
          destination = 'STOCK';
        } else if (['DAMAGED_STOCK', 'SCRAP', 'WRITEOFF'].includes(rawDest) || action === 'SCRAP') {
          destination = 'DAMAGED_STOCK';
        } else if (['REPAIR', 'SUPPLIER_REPAIR'].includes(rawDest) || action === 'REPAIR' || action === 'EXCHANGE') {
          destination = 'REPAIR';
        }

        // Create return_item
        const createdReturnItem = await return_items.create({
          return_id: newReturn.return_id,
          product_id,
          return_quantity,
          quantity: return_quantity,
          condition,
          action,
          refund_amount,
          return_reason: itemReason,
          destination,
          destination_note: item.destination_note || null,
          exchange_product_id: item.exchange_product_id || null
        }, { transaction: t });

        // Update bill item quantity and total
        const billItem = await bill_items.findOne({ where: { bill_id, product_id }, transaction: t });
        if (billItem) {
          const remainingQty = billItem.quantity - return_quantity;
          if (remainingQty <= 0) {
            await billItem.destroy({ transaction: t });
          } else {
            const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
            const remainingDiscount = perUnitDiscount * remainingQty;
            const remainingTotal = Math.max(0, remainingQty * Number(billItem.price_per_unit) - remainingDiscount);

            await billItem.update({
              quantity: remainingQty,
              discount: remainingDiscount,
              total_price: remainingTotal
            }, { transaction: t });
          }
        }

        // Update Inventory in inventory_statuses table
        let [invStatus] = await inventory_statuses.findOrCreate({
          where: { product_id },
          defaults: { product_id, available_qty: 0, repair_qty: 0, damaged_qty: 0 },
          transaction: t
        });

        const product = await products.findByPk(product_id, { transaction: t });

        if (action === 'REFUND') {
          // Increase available stock
          await invStatus.increment('available_qty', { by: return_quantity, transaction: t });
          if (product) {
            await product.increment('stock_quantity', { by: return_quantity, transaction: t });
          }
        } else if (['REPAIR', 'EXCHANGE', 'SUPPLIER_RETURN'].includes(action) || ['REPAIR', 'SUPPLIER'].includes(destination)) {
          // Move item to repair_qty in separate table
          await invStatus.increment('repair_qty', { by: return_quantity, transaction: t });

          // Create supplier_service entry using warranty data provided by user on the frontend
          const targetSupplierId = supplier_id || product?.preferred_supplier_id || 1;
          const repairCost = parseFloat(item.repair_cost) || 0;
          const discountPct = parseFloat(item.discount_percentage) || 0;

          // Use warranty status from user input (has_warranty, warranty_status from payload)
          // If warranty is VALID, cost = 0; otherwise use entered cost
          const isWarrantyValid = item.has_warranty === true && item.warranty_status === 'VALID';
          const finalRepairCost = isWarrantyValid ? 0 : repairCost;
          const finalDiscount = isWarrantyValid ? 100 : discountPct;
          const discountAmt = finalRepairCost * (finalDiscount / 100);
          const customerPayment = Math.max(0, finalRepairCost - discountAmt);

          await supplier_services.create({
            return_item_id: createdReturnItem.return_item_id,
            supplier_id: targetSupplierId,
            service_type: action === 'EXCHANGE' ? 'EXCHANGE' : 'REPAIR',
            repair_cost: parseFloat(finalRepairCost.toFixed(2)),
            discount_percentage: parseFloat(finalDiscount.toFixed(2)),
            customer_payment: parseFloat(customerPayment.toFixed(2)),
            status: 'PENDING'
          }, { transaction: t });

          // Create entry in supplier_returns for sent to supplier inventory tracking
          await supplier_returns.create({
            return_id: newReturn.return_id,
            supplier_id: targetSupplierId,
            product_id,
            quantity: return_quantity,
            status: 'SENT_TO_SUPPLIER'
          }, { transaction: t });
        } else if (action === 'SCRAP' || action === 'OTHER') {
          // Move item to damaged_qty in separate table
          await invStatus.increment('damaged_qty', { by: return_quantity, transaction: t });
        }
      }

      // Add payment refund record if cash refund occurred
      if (actual_cash_refund > 0) {
        await payments.create({
          bill_id,
          amount_paid: -Math.abs(actual_cash_refund),
          payment_method: 'REFUND'
        }, { transaction: t });
      }

      // Update Bill Totals
      if (total_refund_amount > 0) {
        const newTotalAmount = Math.max(0, parseFloat(bill.total_amount) - total_refund_amount);
        const newSubtotal = Math.max(0, parseFloat(bill.subtotal) - total_refund_amount);

        const newPaymentSum = await payments.sum('amount_paid', { where: { bill_id }, transaction: t }) || 0;
        let newBalanceDue = newTotalAmount - newPaymentSum;
        if (Number.isNaN(newBalanceDue) || newBalanceDue < 0) newBalanceDue = 0;

        await bill.update({
          subtotal: newSubtotal,
          total_amount: newTotalAmount,
          balance_due: newBalanceDue,
          status: newBalanceDue > 0 ? 'PARTIAL' : 'PAID'
        }, { transaction: t });
      }

      await audit_log.create({
        user_id: userId,
        action: 'PROCESS_RETURN_MANAGEMENT',
        details: JSON.stringify({
          bill_no: bill.bill_no,
          return_id: newReturn.return_id,
          return_type,
          actual_cash_refund,
          items_count: items.length
        })
      }, { transaction: t });

      return newReturn;
    });
  }

  static async getReturnsByBill(billId) {
    return await returns.findAll({
      where: { bill_id: billId },
      include: [
        {
          model: return_items,
          as: 'items',
          include: [
            { model: products, attributes: ['product_name'] },
            { model: supplier_services, as: 'supplier_service' }
          ]
        }
      ]
    });
  }

  static async previewRefund(billId, productId, returnQty) {
    if (!billId || !productId || returnQty == null) {
      throw new Error('bill_id, product_id, and return_qty are required');
    }

    const billItem = await bill_items.findOne({
      where: { bill_id: billId, product_id: productId }
    });

    if (!billItem) {
      throw new Error('Bill item not found for this bill and product');
    }

    const max_returnable = Number(billItem.quantity);
    const requestedQty = Number(returnQty);

    if (requestedQty > max_returnable) {
      throw new Error('Return quantity exceeds maximum returnable amount');
    }

    const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
    const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * requestedQty).toFixed(2));

    const warrantyInfo = await WarrantyService.checkWarranty(productId);

    return {
      original_qty: max_returnable,
      max_returnable,
      refund_amount,
      warranty: warrantyInfo
    };
  }
}

module.exports = ReturnService;