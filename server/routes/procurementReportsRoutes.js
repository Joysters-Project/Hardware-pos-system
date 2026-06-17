const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/procurementReportsController');
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleGuard');

router.use(auth);
router.use(role(['admin', 'manager']));

router.get('/supplier-performance', ctrl.supplierPerformance);
router.get('/supplier-performance/pdf', ctrl.downloadPerformanceReportPDF);
router.get('/purchases',            ctrl.purchaseSummary);
router.get('/outstanding',          ctrl.outstandingOrders);
router.get('/outstanding/pdf',          ctrl.downloadOutstandingReportPDF);

module.exports = router;
