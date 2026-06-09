const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/procurementReportsController');
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleGuard');

router.use(auth);
router.use(role(['admin', 'manager']));

router.get('/supplier-performance', ctrl.supplierPerformance);
router.get('/purchases',            ctrl.purchaseSummary);
router.get('/outstanding',          ctrl.outstandingOrders);

module.exports = router;
