const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/cashier 
router.get('/cashier', dashboardController.getCashierStats);

module.exports = router;
