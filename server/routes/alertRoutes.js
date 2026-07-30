const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// POST /api/alerts/generate
// GET /api/alerts/summary
// GET /api/alerts/count
// GET /api/alerts/expiry-alerts
// GET /api/alerts (list with filters)
router.post('/generate', alertController.generateAlerts);
router.get('/summary',  alertController.getAlertSummary);
router.get('/count',    alertController.getAlertCount);
router.get('/expiry-alerts', alertController.getExpiryAlerts);
router.get('/',         alertController.getAllAlerts);

// GET /api/alerts/:id
router.get('/:id', alertController.getAlertById);

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', alertController.resolveAlert);

// PUT /api/alerts/:id
router.put('/:id', alertController.updateAlert);

// POST /api/alerts
router.post('/', alertController.createAlert);

// DELETE /api/alerts/:id
router.delete('/:id', alertController.deleteAlert);

module.exports = router;