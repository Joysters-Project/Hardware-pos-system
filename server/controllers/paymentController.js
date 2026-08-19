const { payments } = require('../models');
const DueCollectionService = require('../services/dueCollectionService');

// CREATE Payment
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.collected_by || null;
    const result = await DueCollectionService.collectPayment(req.body, userId);

    res.status(201).json({
      message: "Payment collection processed successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Payments
exports.getAllPayments = async (req, res) => {
  try {
    const { bill_id } = req.query;
    const whereClause = {};
    if (bill_id) {
      whereClause.bill_id = bill_id;
    }
    const paymentList = await payments.findAll({ where: whereClause });

    res.status(200).json(paymentList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Payment By ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await payments.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Payment
exports.updatePayment = async (req, res) => {
  try {
    const payment = await payments.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    await payment.update(req.body);

    res.status(200).json({
      message: "Payment updated successfully",
      data: payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await payments.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    await payment.destroy();

    res.status(200).json({
      message: "Payment deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
