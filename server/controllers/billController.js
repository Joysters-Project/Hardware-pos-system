const BillingService = require('../services/billingService');
const { bills, bill_items, products, customers, payments } = require('../models');
const { Op } = require('sequelize');

// CREATE Bill (runs entire invoice workflow inside a transaction)
exports.createBill = async (req, res) => {
  try {
    let userId = req.user?.id;

    if (!userId && req.body.user_id) {
      const requestedUser = await BillingService.findUserById(req.body.user_id);
      if (requestedUser) userId = requestedUser.user_id;
    }

    if (!userId) {
      userId = await BillingService.getSystemUserId();
    }

    const bill = await BillingService.createInvoice(req.body, userId);

    res.status(201).json({
      message: 'Bill created successfully',
      data: bill,
    });
  } catch (error) {
    console.error('Billing createBill error:', error);
    res.status(500).json({ error: error.message });
  }
};

// SEARCH Bills by bill_no, customer_name, or phone_no
exports.searchBills = async (req, res) => {
  try {
    const { query, searchType } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    let whereClause = {};
    let include = [{ model: bill_items, include: [products] }];

    if (searchType === 'bill_no') {
      whereClause.bill_no = { [Op.like]: `%${query}%` };
    } else if (searchType === 'customer_name') {
      include.push({
        model: customers,
        where: { customer_name: { [Op.like]: `%${query}%` } },
        required: true
      });
    } else if (searchType === 'phone_no') {
      include.push({
        model: customers,
        where: { phone_no: { [Op.like]: `%${query}%` } },
        required: true
      });
    } else {
      return res.status(400).json({ error: 'Invalid searchType' });
    }

    const billList = await bills.findAll({
      where: whereClause,
      include: include,
      limit: 10
    });

    res.status(200).json(billList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Bills
exports.getAllBills = async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    const whereClause = {};
    if (customer_id) whereClause.customer_id = customer_id;
    if (status) whereClause.status = status;

    const billList = await bills.findAll({
      where: whereClause,
      include: [
        {
          model: customers,
          attributes: ['customer_id', 'customer_name', 'phone_no', 'address']
        },
        {
          model: bill_items,
          include: [{ model: products, attributes: ['product_name'] }]
        },
        {
          model: payments,
          attributes: ['payment_id', 'payment_date', 'amount_paid', 'payment_method', 'collected_by']
        }
      ]
    });

    res.status(200).json(billList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Bill by ID
exports.getBillById = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id, {
      include: [
        {
          model: bill_items,
          include: [products]
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Bill
exports.updateBill = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await bill.update(req.body);

    res.status(200).json({
      message: "Bill updated successfully",
      data: bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Bill
exports.deleteBill = async (req, res) => {
  try {
    const bill = await bills.findByPk(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await bill.destroy();

    res.status(200).json({
      message: "Bill deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};