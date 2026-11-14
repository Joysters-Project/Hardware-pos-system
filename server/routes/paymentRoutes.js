const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const roleGuard = require('../middleware/roleGuard');

const collectPaymentRoles = roleGuard(['admin', 'manager', 'cashier']);
const managePaymentRoles = roleGuard(['admin', 'manager']);

// CREATE Payment
router.post('/', collectPaymentRoles, paymentController.createPayment);

// GET All Payments
router.get('/', paymentController.getAllPayments);

// GET Payment by ID
router.get('/:id', paymentController.getPaymentById);

// UPDATE Payment
router.put('/:id', managePaymentRoles, paymentController.updatePayment);

// DELETE Payment
router.delete('/:id', managePaymentRoles, paymentController.deletePayment);

module.exports = router;