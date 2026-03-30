const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');

// CREATE Brand
router.post('/', brandController.createBrand);

// GET All Brands
router.get('/', brandController.getAllBrands);

// GET Brand by ID
router.get('/:id', brandController.getBrandById);

// UPDATE Brand
router.put('/:id', brandController.updateBrand);

// DELETE Brand
router.delete('/:id', brandController.deleteBrand);

module.exports = router;