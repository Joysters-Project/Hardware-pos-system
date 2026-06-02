const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const returnController = require('../controllers/returnController');

router.get('/lookup-bill', authMiddleware, returnController.lookupBill);
router.get('/preview', authMiddleware, returnController.previewRefund);
router.get('/bill/:billId', authMiddleware, returnController.getReturnsByBill);
router.post('/', authMiddleware, returnController.processReturn);
router.get('/', authMiddleware, roleGuard(['Manager', 'Admin']), returnController.getAllReturns);

module.exports = router;
