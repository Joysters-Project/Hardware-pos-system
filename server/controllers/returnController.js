const { Op } = require('sequelize');
const { bills, bill_items, products, customers, returns, supplier_returns } = require('../models');
const ReturnService = require('../services/returnService');

exports.processReturn = async (req, res) => {
  try {
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
