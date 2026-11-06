const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/analyticsController');
const auth    = require('../middleware/authMiddleware');

router.use(auth);
router.get('/top-products',          ctrl.topProducts);
router.get('/cashier-activity',      ctrl.cashierActivity);
router.get('/regular-customers',     ctrl.regularCustomers);
router.get('/regular-suppliers',     ctrl.regularSuppliers);
router.get('/supplier-returns',      ctrl.supplierReturnedProducts);
router.get('/borrow-balances',       ctrl.borrowBalances);

module.exports = router;
