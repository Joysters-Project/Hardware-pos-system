const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const db = require('../models');

// --- SEARCH LOGIC (From your local HEAD) ---
router.get('/search', async (req, res) => {
  console.log('Route /api/products/search called with query:', req.query);
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.json([]);
    }

    const lowerQuery = query.toLowerCase();
    const searchClauses = [
      db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('product_name')),
        { [db.Sequelize.Op.like]: `%${lowerQuery}%` }
      ),
      db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('type')),
        { [db.Sequelize.Op.like]: `%${lowerQuery}%` }
      ),
      db.Sequelize.where(
        db.Sequelize.fn('LOWER', db.Sequelize.col('batch_no')),
        { [db.Sequelize.Op.like]: `%${lowerQuery}%` }
      )
    ];

    const productId = parseInt(query, 10);
    if (!Number.isNaN(productId)) {
      searchClauses.push({ product_id: productId });
    }

    const results = await db.products.findAll({
      where: {
        [db.Sequelize.Op.or]: searchClauses
      },
      include: [
        { model: db.units, attributes: ['unit_id', 'unit_name'] },
        {
          model: db.product_units,
          as: 'alternative_units',
          include: [
            { model: db.units, as: 'unit_details', attributes: ['unit_id', 'unit_name'] }
          ]
        }
      ],
      limit: 50,
      order: [['product_name', 'ASC']]
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- STANDARD CRUD (From Developer Branch) ---

// CREATE Product
router.post('/', productController.createProduct);

// GET All Products
router.get('/', (req, res, next) => {
  console.log('Route /api/products/ (list) called');
  return productController.getAllProducts(req, res, next);
});

// GET Product by ID
router.get('/:id', productController.getProductById);

// UPDATE Product
router.put('/:id', productController.updateProduct);

// DELETE Product
router.delete('/:id', productController.deleteProduct);

module.exports = router;