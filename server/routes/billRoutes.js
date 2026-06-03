const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');


// CREATE Bill
router.post('/', billController.createBill);

// SEARCH Bills
router.get('/search', billController.searchBills);

// GET All Bills
router.get('/', billController.getAllBills);

// GET Bill by ID
router.get('/:id', billController.getBillById);

// UPDATE Bill
router.put('/:id', billController.updateBill);

// DELETE Bill
router.delete('/:id', billController.deleteBill);

module.exports = router;