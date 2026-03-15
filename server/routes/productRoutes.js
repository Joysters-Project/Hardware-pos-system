const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// CREATE Product
router.post('/', productController.createProduct);

// GET All Products
router.get('/', productController.getAllProducts);

// GET Product by ID
router.get('/:id', productController.getProductById);

// UPDATE Product
router.put('/:id', productController.updateProduct);

// DELETE Product
router.delete('/:id', productController.deleteProduct);

module.exports = router;