const express = require('express');
const router = express.Router();
const billController = require('../controller/billController');

// POST request to create a bill
router.post('/create', billController.generateBill);

module.exports = router;