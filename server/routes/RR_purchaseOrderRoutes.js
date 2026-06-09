const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/RR_purchaseOrderController');
const auth    = require('../middleware/authMiddleware');

router.use(auth);

router.post('/',                      ctrl.createPurchaseOrder);
router.get('/',                       ctrl.getAllPurchaseOrders);
router.get('/:id',                    ctrl.getPurchaseOrderById);
router.put('/:id/status',             ctrl.updateStatus);
router.put('/:id/cancel',             ctrl.cancelPurchaseOrder);
router.get('/:id/export-pdf',         ctrl.exportPurchaseOrderPDF);
router.delete('/:id',                 ctrl.deletePurchaseOrder);

module.exports = router;
