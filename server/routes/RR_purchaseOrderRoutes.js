const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/RR_purchaseOrderController');

router.post('/', purchaseOrderController.createPurchaseOrder);
router.get('/', purchaseOrderController.getAllPurchaseOrders);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);
router.put('/:id', purchaseOrderController.updatePurchaseOrder);
router.put('/:id/cancel', purchaseOrderController.cancelPurchaseOrder);
router.get('/:id/export-pdf', purchaseOrderController.exportPurchaseOrderPDF);
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

module.exports = router;
