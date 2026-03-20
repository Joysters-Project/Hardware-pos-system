const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// CREATE Category
router.post('/', categoryController.createCategory);

// GET All Categories
router.get('/', categoryController.getAllCategories);

// GET Category by ID
router.get('/:id', categoryController.getCategoryById);

// UPDATE Category
router.put('/:id', categoryController.updateCategory);

// DELETE Category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;