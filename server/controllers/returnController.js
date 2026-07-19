const { returns, products, payments, bills, bill_items, sequelize } = require('../models');
﻿const { Op } = require('sequelize');
const {  customers, supplier_returns } = require('../models');
const ReturnService = require('../services/returnService');

exports.processReturn = async (req, res) => {
  try {
    const userId = req.user?.user_id || 1; // Fallback to 1 if not set
    const userRole = req.user?.role || 'Admin'; // Fallback to Admin if not set
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
      const trimmedBillNo = bill_no.toString().trim();
      const normalizedTerm = trimmedBillNo.toLowerCase();
      const clauses = [];

      if (normalizedTerm.length > 0) {
        clauses.push(
          bills.sequelize.where(
            bills.sequelize.fn('LOWER', bills.sequelize.col('bill_no')),
            normalizedTerm
          )
        );
        clauses.push(
          bills.sequelize.where(
            bills.sequelize.fn('LOWER', bills.sequelize.col('bill_no')),
            { [Op.like]: `%${normalizedTerm}%` }
          )
        );
      }

      const asId = parseInt(trimmedBillNo, 10);
      if (!Number.isNaN(asId)) {
        clauses.push({ bill_id: asId });
      }

      const results = await bills.findAll({
        where: { [Op.or]: clauses },
        include: [
          {
            model: bill_items,
            include: [{ model: products, attributes: ['product_name'] }]
          },
          {
            model: customers,
            attributes: ['customer_id', 'customer_name', 'phone_no']
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
        },
        {
          model: customers,
          attributes: ['customer_id', 'customer_name', 'phone_no']
        }
      ]
    });

    if (!billsForCustomer.length) {
      return res.status(404).json({ success: false, error: 'No bills found for this customer' });
    }

    res.status(200).json({ success: true, data: billsForCustomer });
  } catch (error) {
    console.error('Lookup bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllReturns = async (req, res) => {
  try {
    const { destination, from_date, to_date } = req.query;
    const headerWhere = {};
    const itemWhere = {};

    const userRole = req.user?.role || '';
    const isCashier = userRole.toLowerCase() === 'cashier';

    if (destination) itemWhere.destination = destination;

    if (isCashier) {
      // Cashiers can ONLY see today's returns
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      headerWhere.return_date = { [Op.gte]: today };
    } else if (from_date || to_date) {
      headerWhere.return_date = {};
      if (from_date) headerWhere.return_date[Op.gte] = new Date(from_date);
      if (to_date) headerWhere.return_date[Op.lte] = new Date(to_date);
    }

    // We need to require return_items here since it might not be in the file scope
    const { return_items } = require('../models');

    // Build the include array — supplier_returns is optional
    const { customers } = require('../models');
    const includeArr = [
      {
        model: bills,
        attributes: ['bill_no', 'bill_id', 'total_amount', 'balance_due', 'bill_date', 'customer_id'],
        required: false,
        include: [
          { model: payments, attributes: ['amount_paid'] },
          { model: customers, attributes: ['customer_id', 'customer_name', 'phone_no'] }
        ]
      },
      {
        model: return_items,
        as: 'items',
        required: Object.keys(itemWhere).length > 0,
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        include: [{ model: products, attributes: ['product_name', 'product_id'] }]
      }
    ];

    // Only include supplier_returns if the model exists and is associated
    try {
      includeArr.push({
        model: supplier_returns,
        required: false,
        attributes: ['supplier_id', 'quantity', 'status', 'created_at']
      });
    } catch (_) { /* skip if not available */ }

    // Fetch returns with associated bill total and payments
    const returnListRaw = await returns.findAll({
      where: headerWhere,
      include: includeArr,
      order: [['return_date', 'DESC']]
    });

    // Attach financial summary and detailed return summary to each return
    // Sequelize auto-alias for belongsTo(bills) is 'bill' (singular)
    const returnList = returnListRaw.map(ret => {
      const plain = ret.get({ plain: true });
      const bill = plain.bill || plain.bills || {};
      const returnItems = plain.items || [];
      const currentBillTotal = parseFloat(bill.total_amount) || 0;
      const billPayments = bill.payments || [];
      
      // Original bill total before returns = current bill total + sum of all negative payments (refunds) on this bill
      const totalRefundedOnBill = billPayments
        .filter(p => parseFloat(p.amount_paid) < 0)
        .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount_paid)), 0);
      const originalBillTotal = currentBillTotal + totalRefundedOnBill;
      
      // Original paid amount = sum of all positive payments (payments from customer) on this bill
      const originalPaid = billPayments
        .filter(p => parseFloat(p.amount_paid) > 0)
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

      const refundable = Math.min(plain.total_refund_amount || 0, originalPaid);
      
      // Calculate per-product totals
      const productTotals = {};
      let grandTotalReturned = 0;
      
      returnItems.forEach(item => {
        const productName = item.product?.product_name || 'Unknown Product';
        const refundAmount = parseFloat(item.refund_amount) || 0;
        
        if (!productTotals[productName]) {
          productTotals[productName] = {
            product_name: productName,
            total_returned_qty: 0,
            total_amount_per_product: 0
          };
        }
        
        productTotals[productName].total_returned_qty += item.return_quantity;
        productTotals[productName].total_amount_per_product += refundAmount;
        grandTotalReturned += refundAmount;
      });
      
      return {
        ...plain,
        bill: bill,
        bill_number: bill.bill_no,
        returned_products: Object.values(productTotals),
        grand_total_returned: parseFloat(grandTotalReturned.toFixed(2)),
        financial_summary: {
          total_bill: originalBillTotal,
          total_paid: originalPaid,
          refundable_amount: refundable
        }
      };
    });

    res.status(200).json({ success: true, data: returnList });
  } catch (error) {
    console.error('getAllReturns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
