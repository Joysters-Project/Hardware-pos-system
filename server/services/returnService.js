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
  audit_log,
  sequelize
} = require('../models');

class ReturnService {
  static async processReturn(returnData, userId, userRole) {
    const bill_id = Number(returnData.bill_id);
    const items = returnData.items; // Array of items
    const supplier_id = returnData.supplier_id ? Number(returnData.supplier_id) : null;
    const po_id = returnData.po_id ? Number(returnData.po_id) : null;

    if (!bill_id || !Array.isArray(items) || items.length === 0) {
      throw new Error('bill_id and items array are required');
    }

    const validDestinations = ['STOCK', 'REPAIR', 'SUPPLIER', 'WRITEOFF', 'DAMAGED_STOCK'];

    return await sequelize.transaction(async (t) => {
      const bill = await bills.findByPk(bill_id, { transaction: t });
      if (!bill) {
        throw new Error('Bill not found');
      }

      let total_refund_amount = 0;
      let hasSupplierReturn = false;

      // Validate all items first
      for (const item of items) {
        const product_id = Number(item.product_id);
        const return_quantity = Number(item.return_quantity);
        const destination = String(item.destination || 'STOCK').toUpperCase();
        
        if (!validDestinations.includes(destination)) {
          throw new Error(`Invalid destination: ${destination}`);
        }
        if (['WRITEOFF', 'SUPPLIER'].includes(destination) && !['Manager', 'Admin'].includes(userRole)) {
          throw new Error('Destination requires Manager or Admin role');
        }
        if (destination === 'SUPPLIER') {
          if (!supplier_id) throw new Error('Supplier ID is required for supplier returns');
          hasSupplierReturn = true;
        }

        const billItem = await bill_items.findOne({ where: { bill_id, product_id }, transaction: t });
        if (!billItem) {
          throw new Error(`Bill item not found for product ${product_id}`);
        }

        if (return_quantity > billItem.quantity) {
          throw new Error(`Return quantity exceeds billed quantity for product ${product_id}`);
        }

        // We can optionally check already returned quantity if we keep history of bill_items.
        // Currently the system deletes/decreases bill_items on return.
        
        // Calculate refund for this item based on current bill item state
        const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
        const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * return_quantity).toFixed(2));
        
        // Attach calculated refund to the item object for later use
        item.calculated_refund = refund_amount;
        total_refund_amount += refund_amount;
      }

      const original_balance_due = parseFloat(bill.balance_due) || 0;
      let actual_cash_refund = 0;
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

      // Create Return Header (stores the actual cash refund amount given)
      const newReturn = await returns.create({
        bill_id,
        return_date: new Date(),
        total_refund_amount: actual_cash_refund,
        processed_by: userId,
        status: hasSupplierReturn ? 'PENDING_APPROVAL' : 'COMPLETED',
        po_id,
        supplier_id
      }, { transaction: t });

      // Process each item
      for (const item of items) {
        const product_id = Number(item.product_id);
        const return_quantity = Number(item.return_quantity);
        const refund_amount = item.calculated_refund;
        const destination = String(item.destination || 'STOCK').toUpperCase();
        const reason = item.return_reason || 'Unknown';
        const destination_note = item.destination_note || null;

        // Create return_item (refund_amount here is the returned item value)
        await return_items.create({
          return_id: newReturn.return_id,
          product_id,
          return_quantity,
          refund_amount,
          return_reason: reason,
          destination,
          destination_note
        }, { transaction: t });

        // Update bill item quantity and total
        const billItem = await bill_items.findOne({ where: { bill_id, product_id }, transaction: t });
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

        // Update Inventory based on destination
        // STOCK: add back to active stock
        // REPAIR / DAMAGED_STOCK / WRITEOFF: destination tracked via return_items.destination only
        if (destination === 'STOCK') {
          await products.increment('stock_quantity', { by: return_quantity, where: { product_id }, transaction: t });
        } else if (destination === 'SUPPLIER') {
          await supplier_returns.create({
            return_id: newReturn.return_id,
            supplier_id,
            product_id,
            quantity: return_quantity
          }, { transaction: t });
        }
      }

      // Add single payment record for the total refund if there is actual cash refund
      if (actual_cash_refund > 0) {
        await payments.create({
          bill_id,
          amount_paid: -Math.abs(actual_cash_refund),
          payment_method: hasSupplierReturn ? 'SUPPLIER_RETURN' : 'REFUND'
        }, { transaction: t });
      }

      // Update Bill Totals (subtracting the full value of returned products)
      const newTotalAmount = Math.max(0, parseFloat(bill.total_amount) - total_refund_amount);
      const newSubtotal = Math.max(0, parseFloat(bill.subtotal) - total_refund_amount);
      
      const newPaymentSum = await payments.sum('amount_paid', { where: { bill_id }, transaction: t }) || 0;
      let newBalanceDue = newTotalAmount - newPaymentSum;
      if (Number.isNaN(newBalanceDue)) newBalanceDue = 0;
      if (newBalanceDue < 0) newBalanceDue = 0;

      const updatedStatus = newBalanceDue > 0 ? 'PARTIAL' : 'PAID';

      await bill.update({
        subtotal: newSubtotal,
        total_amount: newTotalAmount,
        balance_due: newBalanceDue,
        status: updatedStatus
      }, { transaction: t });

      await audit_log.create({
        user_id: userId,
        action: 'PROCESS_MULTI_ITEM_RETURN',
        details: JSON.stringify({
          bill_no: bill.bill_no,
          total_refund_amount: actual_cash_refund,
          total_returned_value: total_refund_amount,
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
          include: [{ model: products, attributes: ['product_name'] }]
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

    // Since we delete bill_items when they are fully returned, 
    // the current billItem quantity IS the maximum returnable.
    const max_returnable = Number(billItem.quantity);
    const requestedQty = Number(returnQty);

    if (requestedQty > max_returnable) {
      throw new Error('Return quantity exceeds maximum returnable amount');
    }

    const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
    const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * requestedQty).toFixed(2));

    return {
      original_qty: max_returnable,
      already_returned: 0, // Since bill items are decreased, this doesn't apply the same way
      max_returnable,
      refund_amount
    };
  }
}

module.exports = ReturnService;