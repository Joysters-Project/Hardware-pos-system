const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurementPaymentController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/dashboard', ctrl.getPaymentDashboard);
router.get('/cheque-alerts', ctrl.getChequeAlerts);
router.get('/supplier/:id', ctrl.getSupplierPayments);
router.get('/:id/pdf', ctrl.downloadPaymentReceipt);
router.get('/:id', ctrl.getPaymentById);
router.get('/', ctrl.getAllPayments);
router.post('/', ctrl.recordPayment);
router.patch('/:id/cheque-status', ctrl.updateChequeStatus);

module.exports = router;
