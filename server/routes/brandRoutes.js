const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const authMiddleware = require('../middleware/authMiddleware');

// CREATE Brand
router.post('/', authMiddleware, brandController.createBrand);

// GET All Brands
router.get('/', brandController.getAllBrands);

// GET Brand by ID
router.get('/:id', brandController.getBrandById);

// UPDATE Brand (supports both PUT and PATCH)
router.put('/:id', authMiddleware, brandController.updateBrand);
router.patch('/:id', authMiddleware, brandController.updateBrand);

// DELETE Brand
router.delete('/:id', authMiddleware, brandController.deleteBrand);

module.exports = router;