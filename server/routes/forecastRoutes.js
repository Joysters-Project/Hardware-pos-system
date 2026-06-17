const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/forecastController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/report/pdf', ctrl.getForecastReportPDF);
router.get('/:productId', ctrl.getProductForecast);
router.get('/', ctrl.getForecasts);

module.exports = router;
