const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const ctrl = require('../controllers/chequeExchangeController');

// All routes require authentication + admin or manager role
router.use(authMiddleware);
router.use(roleGuard(['admin', 'manager']));

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Reports
router.get('/reports', ctrl.getReports);

// Banks list
router.get('/banks', ctrl.getBanks);

// Customers
router.get('/customers',         ctrl.getCustomers);
router.get('/customers/:id',     ctrl.getCustomerById);
router.post('/customers',        ctrl.createCustomer);
router.put('/customers/:id',     ctrl.updateCustomer);
router.delete('/customers/:id',  ctrl.deleteCustomer);

// Cheques
router.get('/',                          ctrl.getCheques);
router.get('/:id',                       ctrl.getChequeById);
router.post('/',                         ctrl.createCheque);
router.put('/:id',                       ctrl.updateCheque);
router.patch('/:id/status',              ctrl.updateChequeStatus);
router.patch('/:id/deposit',             ctrl.depositCheque);
router.patch('/:id/repayment',           ctrl.recordRepayment);
router.delete('/:id',                    ctrl.deleteCheque);

module.exports = router;
