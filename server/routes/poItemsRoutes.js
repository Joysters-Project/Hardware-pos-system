const express = require('express');
const router = express.Router();
const poItemsController = require('../controllers/poItemsController');

// CREATE PO Item
router.post('/', poItemsController.createPoItem);

// GET All PO Items
router.get('/', poItemsController.getAllPoItems);

// GET PO Item by ID
router.get('/:id', poItemsController.getPoItemById);

// UPDATE PO Item
router.put('/:id', poItemsController.updatePoItem);

// DELETE PO Item
router.delete('/:id', poItemsController.deletePoItem);

module.exports = router;