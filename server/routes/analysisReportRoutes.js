const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analysisReportController');

router.get('/monthly', ctrl.getMonthlyAnalysis);
router.get('/yearly', ctrl.getYearlyAnalysis);

module.exports = router;
