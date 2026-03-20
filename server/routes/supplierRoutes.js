const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// CREATE Supplier
router.post('/', supplierController.createSupplier);

// GET All Suppliers
router.get('/', supplierController.getAllSuppliers);

// GET Supplier by ID
router.get('/:id', supplierController.getSupplierById);

// UPDATE Supplier
router.put('/:id', supplierController.updateSupplier);

// DELETE Supplier
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;