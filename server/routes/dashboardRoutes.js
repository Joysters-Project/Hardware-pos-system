const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/cashier 
router.get('/cashier', dashboardController.getCashierStats);

// GET /api/dashboard/analytical
router.get('/analytical', dashboardController.getAnalyticalStats);

// GET /api/dashboard/analytical/export-pdf
router.get('/analytical/export-pdf', dashboardController.exportAnalyticalPDF);

module.exports = router;
