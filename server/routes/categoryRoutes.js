const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// CREATE Category
router.post('/', categoryController.createCategory);

// GET All Categories
router.get('/', categoryController.getAllCategory);

// GET Category by ID
router.get('/:id', categoryController.getCategoryById);

// UPDATE Category (supports both PUT and PATCH)
router.put('/:id', categoryController.updateCategory);

router.patch('/:id', categoryController.updateCategory);

// DELETE Category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;