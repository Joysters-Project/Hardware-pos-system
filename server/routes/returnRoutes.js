const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');

// CREATE Return
router.post('/', returnController.createReturn);

// PROCESS Return (Complex workflow)
router.post('/process', returnController.processReturn);

// GET All Returns
router.get('/', returnController.getAllReturns);

// GET Return by ID
router.get('/:id', returnController.getReturnById);

// UPDATE Return
router.put('/:id', returnController.updateReturn);

// DELETE Return
router.delete('/:id', returnController.deleteReturn);

module.exports = router;