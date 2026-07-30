const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

// CREATE Purchase Order
router.post('/', purchaseOrderController.createPurchaseOrder);

// GET All Purchase Orders
router.get('/', purchaseOrderController.getAllPurchaseOrders);

// GET Purchase Order for Product
router.get('/product/:productId', purchaseOrderController.getPurchaseOrderByProduct);

// GET Purchase Order by ID
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

// UPDATE Purchase Order
router.put('/:id', purchaseOrderController.updatePurchaseOrder);

// DELETE Purchase Order
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

module.exports = router;