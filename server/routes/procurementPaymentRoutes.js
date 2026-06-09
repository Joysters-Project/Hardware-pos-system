const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurementPaymentController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/dashboard', ctrl.getPaymentDashboard);
router.get('/supplier/:id', ctrl.getSupplierPayments);
router.get('/:id/pdf', ctrl.downloadPaymentReceipt);
router.get('/:id', ctrl.getPaymentById);
router.get('/', ctrl.getAllPayments);
router.post('/', ctrl.recordPayment);

module.exports = router;
