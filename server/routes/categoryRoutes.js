const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// CREATE Category
router.post('/', authMiddleware, categoryController.createCategory);

// GET All Categories
router.get('/', categoryController.getAllCategories);

// GET Category by ID
router.get('/:id', categoryController.getCategoryById);

// UPDATE Category (supports both PUT and PATCH)
router.put('/:id', authMiddleware, categoryController.updateCategory);
router.patch('/:id', authMiddleware, categoryController.updateCategory);

// DELETE Category
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;