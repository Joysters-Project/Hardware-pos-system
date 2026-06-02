const { returns, products, payments, bills, bill_items, sequelize } = require('../models');
﻿const { Op } = require('sequelize');
const { bills, customers, supplier_returns } = require('../models');
const ReturnService = require('../services/returnService');

exports.processReturn = async (req, res) => {
  try {
    const {
      bill_id,
      product_id,
      return_quantity,
      refund_amount,
      destination,
      reason,
      po_id,
      supplier_id
    } = req.body;

    if (!bill_id || !product_id || !return_quantity || refund_amount == null) {
      throw new Error('bill_id, product_id, return_quantity and refund_amount are required');
    }

    const bill = await bills.findByPk(bill_id, { transaction });
    if (!bill) {
      throw new Error('Bill not found');
    }

    const billItem = await bill_items.findOne({
      where: { bill_id, product_id },
      transaction
    });

    if (!billItem) {
      throw new Error('This product is not part of the selected bill');
    }

    if (return_quantity > billItem.quantity) {
      throw new Error('Return quantity exceeds quantity sold in the bill');
    }

    const pricePerUnit = parseFloat(billItem.price_per_unit);
    const currentQty = billItem.quantity;
    const lineDiscount = parseFloat(billItem.discount || 0);
    const perUnitDiscount = currentQty > 0 ? lineDiscount / currentQty : 0;
    const remainingQty = currentQty - return_quantity;
    const remainingDiscount = perUnitDiscount * remainingQty;
    const remainingTotal = Math.max(0, remainingQty * pricePerUnit - remainingDiscount);

    if (remainingQty <= 0) {
      await billItem.destroy({ transaction });
    } else {
      await billItem.update(
        {
          quantity: remainingQty,
          discount: remainingDiscount,
          total_price: remainingTotal
        },
        { transaction }
      );
    }

    const returnData = {
      bill_id,
      product_id,
      return_quantity,
      refund_amount,
      destination: destination || 'STOCK',
      reason,
      po_id,
      supplier_id
    };

    if (destination === 'SUPPLIER') {
      returnData.status = 'PENDING_APPROVAL';
      returnData.debit_note_raised = true;
    } else {
      returnData.status = 'COMPLETED';
    }

    const newReturn = await returns.create(returnData, { transaction });

    if (destination === 'STOCK') {
      const product = await products.findByPk(product_id, { transaction });
      if (product) {
        await product.increment('stock_quantity', { by: return_quantity, transaction });
      }
    }

    await payments.create(
      {
        bill_id,
        amount_paid: -Math.abs(refund_amount),
        payment_method: destination === 'SUPPLIER' ? 'SUPPLIER_RETURN' : 'REFUND'
      },
      { transaction }
    );

    const paymentSum = await payments.sum('amount_paid', {
      where: { bill_id },
      transaction
    }) || 0;

    const newTotalAmount = Math.max(0, parseFloat(bill.total_amount) - parseFloat(refund_amount));
    const newSubtotal = Math.max(0, parseFloat(bill.subtotal) - parseFloat(refund_amount));
    let newBalanceDue = newTotalAmount - paymentSum;
    if (Number.isNaN(newBalanceDue)) newBalanceDue = 0;
    if (newBalanceDue < 0) newBalanceDue = 0;

    const updatedStatus = newBalanceDue > 0 ? 'PARTIAL' : 'PAID';

    await bill.update(
      {
        subtotal: newSubtotal,
        total_amount: newTotalAmount,
        balance_due: newBalanceDue,
        status: updatedStatus
      },
      { transaction }
    );

    await transaction.commit();

    const updatedBill = await bills.findByPk(bill_id, {
      include: [
        {
          model: bill_items,
          include: [products]
        }
      ]
    });

    res.status(201).json({
      message: "Return processed successfully",
      data: newReturn,
      bill: updatedBill
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// CREATE Return
exports.createReturn = async (req, res) => {
  try {
    const newReturn = await returns.create(req.body);
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const data = await ReturnService.processReturn(req.body, userId, userRole);

    res.status(201).json({
      success: true,
      message: 'Return processed successfully',
      data
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.previewRefund = async (req, res) => {
  try {
    const { bill_id, product_id, return_qty } = req.query;
    if (!bill_id || !product_id || !return_qty) {
      return res.status(400).json({ success: false, error: 'bill_id, product_id, and return_qty are required' });
    }

    const result = await ReturnService.previewRefund(
      Number(bill_id),
      Number(product_id),
      Number(return_qty)
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getReturnsByBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const returnsByBill = await ReturnService.getReturnsByBill(Number(billId));

    res.status(200).json({ success: true, data: returnsByBill });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.lookupBill = async (req, res) => {
  try {
    const { bill_no, phone } = req.query;

    if (!bill_no && !phone) {
      return res.status(400).json({ success: false, error: 'bill_no or phone is required' });
    }

    if (bill_no) {
      const trimmedBillNo = bill_no.trim();
      const clauses = [];

      // Exact match on bill_no
      if (trimmedBillNo.length > 0) clauses.push({ bill_no: trimmedBillNo });

      // Partial match on bill_no
      clauses.push({ bill_no: { [Op.like]: `%${trimmedBillNo}%` } });

      // If numeric, allow matching by bill_id as well
      const asId = parseInt(trimmedBillNo, 10);
      if (!Number.isNaN(asId)) clauses.push({ bill_id: asId });

      const results = await bills.findAll({
        where: { [Op.or]: clauses },
        include: [
          {
            model: bill_items,
            include: [{ model: products, attributes: ['product_name'] }]
          }
        ],
        order: [['bill_date', 'DESC']]
      });

      if (!results || results.length === 0) {
        return res.status(404).json({ success: false, error: 'Bill not found' });
      }

      return res.status(200).json({ success: true, data: results });
    }

    const trimmedPhone = phone.trim();
    const customer = await customers.findOne({ 
      where: { 
        phone_no: {
          [Op.like]: `%${trimmedPhone}%`
        }
      } 
    });
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const billsForCustomer = await bills.findAll({
      where: { customer_id: customer.customer_id },
      include: [
        {
          model: bill_items,
          include: [{ model: products, attributes: ['product_name'] }]
        }
      ]
    });

    if (!billsForCustomer.length) {
      return res.status(404).json({ success: false, error: 'No bills found for this customer' });
    }

    res.status(200).json({ success: true, data: billsForCustomer });
    console.error('Lookup bill error:', error);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllReturns = async (req, res) => {
  try {
    const { destination, from_date, to_date } = req.query;
    const whereClause = {};

    if (destination) whereClause.destination = destination;
    if (from_date || to_date) {
      whereClause.return_date = {};
      if (from_date) whereClause.return_date[Op.gte] = new Date(from_date);
      if (to_date) whereClause.return_date[Op.lte] = new Date(to_date);
    }

    const returnList = await returns.findAll({
      where: whereClause,
      include: [
        { model: bills, attributes: ['bill_no'] },
        { model: products, attributes: ['product_name'] },
        { model: supplier_returns, attributes: ['supplier_id', 'quantity', 'status', 'created_at'] }
      ],
      order: [['return_date', 'DESC']]
    });

    res.status(200).json({ success: true, data: returnList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
