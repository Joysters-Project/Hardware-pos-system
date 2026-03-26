const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/RR_supplierController');

router.post('/', supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.patch('/:id/status', supplierController.updateSupplierStatus);
router.put('/:id/rating', supplierController.updateSupplierRating);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
