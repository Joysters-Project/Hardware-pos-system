const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');

// --- SEARCH LOGIC (From your local HEAD) ---
router.get('/search', async (req, res) => {
  console.log('Route /api/products/search called with query:', req.query);
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.json([]);
    }

    const pattern = `%${query}%`;

    // Use raw query to find matching product IDs including barcode search (avoids Sequelize v3 fn/like incompatibility)
    const rows = await db.sequelize.query(
      `SELECT DISTINCT p.product_id FROM products p
       LEFT JOIN product_units pu ON p.product_id = pu.product_id
       WHERE p.product_name LIKE :pattern
          OR p.type LIKE :pattern
          OR p.batch_no LIKE :pattern
          OR p.barcode LIKE :pattern
          OR pu.barcode LIKE :pattern
          OR CAST(p.product_id AS CHAR) = :exact
       LIMIT 50`,
      { replacements: { pattern, exact: query }, type: db.Sequelize.QueryTypes.SELECT }
    );

    const ids = rows.map(r => r.product_id);
    if (ids.length === 0) return res.json([]);

    const results = await db.products.findAll({
      where: { product_id: ids },
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
router.post('/', authMiddleware, productController.createProduct);

// GET All Products
router.get('/', (req, res, next) => {
  console.log('Route /api/products/ (list) called');
  return productController.getAllProducts(req, res, next);
});

// GET Product by ID
router.get('/:id', productController.getProductById);

// UPDATE Product
router.put('/:id', authMiddleware, productController.updateProduct);

// DELETE Product
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;