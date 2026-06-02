const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const db = require('../models'); // Ensure db is imported for the search logic

// --- SEARCH LOGIC (From your local HEAD) ---
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const results = await db.products.findAll({
      where: {
        [db.Sequelize.Op.and]: [
          { status: { [db.Sequelize.Op.in]: [0, '0', 'active', 'Active', 'ACTIVE'] } },
          {
            [db.Sequelize.Op.or]: [
              { product_name: { [db.Sequelize.Op.like]: `%${query}%` } },
              { product_id: query }
            ]
          }
        ]
      },
      limit: 5 
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STANDARD CRUD (From Developer Branch) ---

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