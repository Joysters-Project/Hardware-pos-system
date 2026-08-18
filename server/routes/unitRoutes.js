const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const authMiddleware = require('../middleware/authMiddleware');

// CREATE Unit
router.post('/', authMiddleware, unitController.createUnit);

// GET All Units
router.get('/', unitController.getAllUnits);

// GET Unit by ID
router.get('/:id', unitController.getUnitById);

// UPDATE Unit (supports both PUT and PATCH)
router.put('/:id', authMiddleware, unitController.updateUnit);
router.patch('/:id', authMiddleware, unitController.updateUnit);

// DELETE Unit
router.delete('/:id', authMiddleware, unitController.deleteUnit);

module.exports = router;