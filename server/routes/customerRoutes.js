const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// CREATE Customer
router.post('/', customerController.createCustomer);

// GET All Customers
router.get('/', customerController.getAllCustomers);

// GET Customer by ID
router.get('/:id', customerController.getCustomerById);

// UPDATE Customer
router.put('/:id', customerController.updateCustomer);

// DELETE Customer
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;