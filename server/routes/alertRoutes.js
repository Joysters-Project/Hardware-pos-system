const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/alerts/generate — scan all products and auto-generate alerts
// GET /api/alerts/generate — scan all products and auto-generate alerts
router.post('/generate', alertController.generateAlerts);

// GET /api/alerts — supports ?unresolved=true&alert_type=Low Stock
router.get('/', alertController.getAllAlerts);

// GET /api/alerts/expiry-alerts
router.get('/expiry-alerts', alertController.getExpiryAlerts);

// GET /api/alerts/:id
router.get('/:id', alertController.getAlertById);

// PUT /api/alerts/:id/resolve  ← MUST be before /:id
router.put('/:id/resolve', alertController.resolveAlert);

// PUT /api/alerts/:id
router.put('/:id', alertController.updateAlert);

// POST /api/alerts
router.post('/', alertController.createAlert);

// DELETE /api/alerts/:id
router.delete('/:id', alertController.deleteAlert);

module.exports = router;