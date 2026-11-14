const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurementPaymentController');
const auth = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');

router.use(auth);

const paymentAlertsRoles = roleGuard(['admin', 'manager']);
const paymentAlertViewRoles = roleGuard(['admin', 'manager', 'cashier']);

router.get('/dashboard', paymentAlertsRoles, ctrl.getPaymentDashboard);
router.get('/cheque-alerts', paymentAlertViewRoles, ctrl.getChequeAlerts);
router.get('/supplier/:id', paymentAlertsRoles, ctrl.getSupplierPayments);
router.get('/:id/pdf', paymentAlertsRoles, ctrl.downloadPaymentReceipt);
router.get('/:id', paymentAlertsRoles, ctrl.getPaymentById);
router.get('/', paymentAlertsRoles, ctrl.getAllPayments);
router.post('/', paymentAlertsRoles, ctrl.recordPayment);
router.patch('/:id/cheque-status', paymentAlertsRoles, ctrl.updateChequeStatus);

module.exports = router;
