const { returns, return_items, products, payments, bills, bill_items, customers, supplier_returns, supplier_services, inventory_statuses, sequelize } = require('../models');
const { Op } = require('sequelize');
const ReturnService = require('../services/returnService');
const WarrantyService = require('../services/warrantyService');

exports.processReturn = async (req, res) => {
  try {
    const userId = req.user?.user_id || 1;
    const userRole = req.user?.role || 'Admin';
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
      parseFloat(return_qty)
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.checkWarrantyStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { warranty_card_no, bill_date } = req.query;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const info = await WarrantyService.checkWarranty(Number(productId), warranty_card_no, bill_date);
    res.status(200).json({ success: true, data: info });
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

exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await returns.findById(id, {
      include: [
        { model: bills, include: [{ model: customers }] },
        { 
          model: return_items, 
          as: 'items',
          include: [
            { model: products },
            { model: supplier_services, as: 'supplier_service' }
          ]
        }
      ]
    });

    if (!returnRecord) {
      return res.status(404).json({ success: false, error: 'Return record not found' });
    }

    res.status(200).json({ success: true, data: returnRecord });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['REQUESTED', 'APPROVED', 'SENT_TO_SUPPLIER', 'REPAIRED', 'COMPLETED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Valid status required: ${validStatuses.join(', ')}` });
    }

    const returnRecord = await returns.findById(id);
    if (!returnRecord) {
      return res.status(404).json({ success: false, error: 'Return record not found' });
    }

    await returnRecord.update({ status });
    res.status(200).json({ success: true, message: 'Return status updated', data: returnRecord });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getInventoryStatuses = async (req, res) => {
  try {
    const list = await inventory_statuses.findAll({
      include: [
        { model: products, attributes: ['product_id', 'product_name', 'unit_price', 'cost_price', 'stock_quantity'] }
      ]
    });
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
            { $like: `%${normalizedTerm}%` }
          )
        );
      }

      const asId = parseInt(trimmedBillNo, 10);
      if (!Number.isNaN(asId)) {
        clauses.push({ bill_id: asId });
      }

      const results = await bills.findAll({
        where: { $or: clauses },
        include: [
          {
            model: bill_items,
            include: [{ model: products, attributes: ['product_id', 'product_name', 'unit_price', 'cost_price'] }]
          },
          {
            model: customers,
            attributes: ['customer_id', 'customer_name', 'phone_no']
          },
          {
            model: payments,
            attributes: ['amount_paid', 'payment_method']
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
          $like: `%${trimmedPhone}%`
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
          include: [{ model: products, attributes: ['product_id', 'product_name', 'unit_price', 'cost_price'] }]
        },
        {
          model: customers,
          attributes: ['customer_id', 'customer_name', 'phone_no']
        },
        {
          model: payments,
          attributes: ['amount_paid', 'payment_method']
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
    const { destination, status, return_type, from_date, to_date } = req.query;
    const headerWhere = {};
    const itemWhere = {};

    const userRole = req.user?.role || '';
    const isCashier = userRole.toLowerCase() === 'cashier';

    if (destination) itemWhere.destination = destination;
    if (status) headerWhere.status = status;
    if (return_type) headerWhere.return_type = return_type;

    if (isCashier) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      headerWhere.return_date = { $gte: today };
    } else if (from_date || to_date) {
      headerWhere.return_date = {};
      if (from_date) headerWhere.return_date$gte = new Date(from_date);
      if (to_date) headerWhere.return_date$lte = new Date(to_date);
    }

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
        include: [
          { model: products, attributes: ['product_name', 'product_id'] },
          { model: supplier_services, as: 'supplier_service' }
        ]
      }
    ];

    try {
      includeArr.push({
        model: supplier_returns,
        required: false,
        attributes: ['supplier_id', 'quantity', 'status', 'created_at']
      });
    } catch (_) { /* skip if not available */ }

    const returnListRaw = await returns.findAll({
      where: headerWhere,
      include: includeArr,
      order: [['return_date', 'DESC']]
    });

    const returnList = returnListRaw.map(ret => {
      const plain = ret.get({ plain: true });
      const bill = plain.bill || plain.bills || {};
      const returnItems = plain.items || [];
      const currentBillTotal = parseFloat(bill.total_amount) || 0;
      const billPayments = bill.payments || [];
      
      const totalRefundedOnBill = billPayments
        .filter(p => parseFloat(p.amount_paid) < 0)
        .reduce((sum, p) => sum + Math.abs(parseFloat(p.amount_paid)), 0);
      const originalBillTotal = currentBillTotal + totalRefundedOnBill;
      
      const originalPaid = billPayments
        .filter(p => parseFloat(p.amount_paid) > 0)
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

      const refundable = Math.min(plain.total_refund_amount || 0, originalPaid);
      
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
        
        productTotals[productName].total_returned_qty = parseFloat((productTotals[productName].total_returned_qty + (parseFloat(item.return_quantity || item.quantity) || 1)).toFixed(2));
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
