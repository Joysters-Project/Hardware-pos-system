const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const returnController = require('../controllers/returnController');

router.get('/lookup-bill', authMiddleware, returnController.lookupBill);
router.get('/preview', authMiddleware, returnController.previewRefund);
router.get('/warranty-check/:productId', authMiddleware, returnController.checkWarrantyStatus);
router.get('/inventory-statuses', authMiddleware, returnController.getInventoryStatuses);
router.get('/bill/:billId', authMiddleware, returnController.getReturnsByBill);
router.get('/:id', authMiddleware, returnController.getReturnById);
router.put('/:id/status', authMiddleware, roleGuard(['Manager', 'Admin']), returnController.updateReturnStatus);
router.post('/', authMiddleware, returnController.processReturn);
router.get('/', authMiddleware, roleGuard(['Manager', 'Admin', 'Cashier']), returnController.getAllReturns);

module.exports = router;
