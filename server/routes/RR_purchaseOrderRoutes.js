const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/RR_purchaseOrderController');
const auth    = require('../middleware/authMiddleware');

router.use(auth);

router.post('/',                           ctrl.createPurchaseOrder);
router.get('/',                            ctrl.getAllPurchaseOrders);
router.get('/:id',                         ctrl.getPurchaseOrderById);
router.put('/:id/status',                  ctrl.updateStatus);
router.put('/:id/cancel',                  ctrl.cancelPurchaseOrder);
router.post('/:id/send-email',               ctrl.sendPOEmail);
router.post('/:poId/items/:itemId/send-comment-email', ctrl.sendItemCommentEmail);
router.patch('/:poId/items/:itemId/comment', ctrl.updateItemComment);
router.get('/:id/export-pdf',              ctrl.exportPurchaseOrderPDF);
router.delete('/:id',                      ctrl.deletePurchaseOrder);

module.exports = router;
