const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplierPerformanceController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/ranking', ctrl.getPerformanceRanking);
router.post('/recalculate', ctrl.recalculateAll);
router.get('/:id', ctrl.getSupplierPerformance);

module.exports = router;
