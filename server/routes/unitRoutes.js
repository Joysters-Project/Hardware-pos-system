const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');

// CREATE Unit
router.post('/', unitController.createUnit);

// GET All Units
router.get('/', unitController.getAllUnits);

// GET Unit by ID
router.get('/:id', unitController.getUnitById);

// UPDATE Unit
router.put('/:id', unitController.updateUnit);

// DELETE Unit
router.delete('/:id', unitController.deleteUnit);

module.exports = router;