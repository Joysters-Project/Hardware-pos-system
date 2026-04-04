const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');

// CREATE Brand
router.post('/', brandController.createBrand);

// GET All Brands
router.get('/', brandController.getAllBrands);

// GET Brand by ID
router.get('/:id', brandController.getBrandById);

// UPDATE Brand (supports both PUT and PATCH)
router.put('/:id', brandController.updateBrand);
router.patch('/:id', brandController.updateBrand);

// DELETE Brand
router.delete('/:id', brandController.deleteBrand);

module.exports = router;