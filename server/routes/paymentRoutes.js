const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// CREATE Payment
router.post('/', paymentController.createPayment);

// GET All Payments
router.get('/', paymentController.getAllPayments);

// GET Payment by ID
router.get('/:id', paymentController.getPaymentById);

// UPDATE Payment
router.put('/:id', paymentController.updatePayment);

// DELETE Payment
router.delete('/:id', paymentController.deletePayment);

module.exports = router;