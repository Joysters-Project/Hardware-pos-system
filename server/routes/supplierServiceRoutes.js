const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const supplierServiceController = require('../controllers/supplierServiceController');

router.get('/', authMiddleware, supplierServiceController.getAllSupplierServices);
router.get('/:id', authMiddleware, supplierServiceController.getSupplierServiceById);
router.post('/', authMiddleware, roleGuard(['Manager', 'Admin']), supplierServiceController.createSupplierService);
router.put('/:id/status', authMiddleware, roleGuard(['Manager', 'Admin']), supplierServiceController.updateSupplierServiceStatus);

module.exports = router;
