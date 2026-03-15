const express = require('express');
const router = express.Router();
const billItemsController = require('../controllers/billItemsController');

// CREATE Bill Item
router.post('/', billItemsController.createBillItem);

// GET All Bill Items
router.get('/', billItemsController.getAllBillItems);

// GET Bill Item by Bill ID and Product ID
router.get('/:bill_id/:product_id', billItemsController.getBillItem);

// UPDATE Bill Item
router.put('/:bill_id/:product_id', billItemsController.updateBillItem);

// DELETE Bill Item
router.delete('/:bill_id/:product_id', billItemsController.deleteBillItem);

module.exports = router;