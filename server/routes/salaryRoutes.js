const express = require('express');
const router  = express.Router();
const c       = require('../controllers/salaryController');

router.get('/stats/dashboard',                c.getDashboardStats);
router.get('/employee/:employee_id/summary',  c.getEmployeeSalarySummary);
router.get('/employee/:employee_id',          c.getEmployeeSalaryHistory);
router.get('/:id/download',                   c.downloadPayslip);
router.get('/:id',                            c.getPaymentById);
router.get('/',                               c.getAllPayments);
router.post('/',                              c.createPayment);
router.put('/:id/pay',                        c.paySalary);
router.put('/:id',                            c.updatePayment);

module.exports = router;
