const { Op } = require('sequelize');
const {
  bills,
  bill_items,
  returns,
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
    const product_id = Number(returnData.product_id);
    const return_quantity = Number(returnData.return_quantity);
    const destination = String(returnData.destination || '').toUpperCase();
    const destination_note = returnData.destination_note || null;
    const supplier_id = returnData.supplier_id ? Number(returnData.supplier_id) : null;
    const po_id = returnData.po_id ? Number(returnData.po_id) : null;
    const reason = returnData.reason || null;

    if (!bill_id || !product_id || !return_quantity || !destination) {
      throw new Error('bill_id, product_id, return_quantity, destination are required');
    }

    const validDestinations = ['STOCK', 'REPAIR', 'SUPPLIER', 'WRITEOFF'];
    if (!validDestinations.includes(destination)) {
      throw new Error('Destination must be one of: STOCK, REPAIR, SUPPLIER, WRITEOFF');
    }

    if (['WRITEOFF', 'SUPPLIER'].includes(destination) && !['Manager', 'Admin'].includes(userRole)) {
      throw new Error('Destination requires Manager or Admin role');
    }

    if (destination === 'SUPPLIER' && !supplier_id) {
      throw new Error('Supplier ID is required');
    }

    const bill = await bills.findByPk(bill_id);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const billItem = await bill_items.findOne({ where: { bill_id, product_id } });
    if (!billItem) {
      throw new Error('Bill item not found for this bill and product');
    }

    if (return_quantity > billItem.quantity) {
      throw new Error('return_quantity exceeds original billed quantity');
    }

    const alreadyReturned = await returns.sum('return_quantity', {
      where: { bill_id, product_id }
    }) || 0;

    if (alreadyReturned + return_quantity > billItem.quantity) {
      throw new Error('Return quantity exceeds available quantity for this bill item');
    }

    const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
    const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * return_quantity).toFixed(2));

    const totalPaid = await payments.sum('amount_paid', {
      where: { bill_id }
    }) || 0;

    if (refund_amount > Number(totalPaid)) {
      throw new Error('Refund amount cannot exceed total paid for this bill');
    }

    return await sequelize.transaction(async (t) => {
      const newReturn = await returns.create({
        bill_id,
        product_id,
        return_quantity,
        refund_amount,
        return_date: new Date(),
        destination,
        destination_note,
        supplier_id,
        po_id,
        debit_note_raised: destination === 'SUPPLIER' && !!po_id,
        processed_by: userId,
        reason
      }, { transaction: t });

      if (destination === 'STOCK') {
        await products.increment('stock_quantity', {
          by: return_quantity,
          where: { product_id },
          transaction: t
        });
      } else if (destination === 'REPAIR') {
        await products.increment('repair_quantity', {
          by: return_quantity,
          where: { product_id },
          transaction: t
        });
      } else if (destination === 'SUPPLIER') {
        await supplier_returns.create({
          return_id: newReturn.return_id,
          supplier_id,
          product_id,
          quantity: return_quantity,
          reason
        }, { transaction: t });
      } else if (destination === 'WRITEOFF') {
        await products.increment('damaged_quantity', {
          by: return_quantity,
          where: { product_id },
          transaction: t
        });
      }

      await audit_log.create({
        user_id: userId,
        action: `PROCESS_RETURN_${destination}`,
        details: JSON.stringify({
          bill_no: bill.bill_no,
          product_id: billItem.product_id,
          return_quantity,
          refund_amount,
          destination,
          destination_note,
          supplier_id,
          po_id,
          debit_note_raised: destination === 'SUPPLIER' && !!po_id
        })
      }, { transaction: t });

      return newReturn;
    });
  }

  static async getReturnsByBill(billId) {
    return await returns.findAll({
      where: { bill_id: billId },
      include: [{ model: products, attributes: ['product_name'] }]
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

    const alreadyReturned = await returns.sum('return_quantity', {
      where: { bill_id: billId, product_id: productId }
    }) || 0;

    const original_qty = Number(billItem.quantity);
    const max_returnable = original_qty - alreadyReturned;
    const requestedQty = Number(returnQty);

    if (requestedQty > max_returnable) {
      throw new Error('Return quantity exceeds maximum returnable amount');
    }

    const perUnitDiscount = Number(billItem.discount || 0) / Number(billItem.quantity || 1);
    const refund_amount = Number(((Number(billItem.price_per_unit) - perUnitDiscount) * requestedQty).toFixed(2));

    return {
      original_qty,
      already_returned: alreadyReturned,
      max_returnable,
      refund_amount
    };
  }
}

module.exports = ReturnService;
