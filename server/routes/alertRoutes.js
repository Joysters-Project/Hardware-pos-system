const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

// CREATE Alert
router.post('/', alertController.createAlert);

// GET All Alerts
router.get('/', alertController.getAllAlerts);

// GET Expiry Alerts
router.get('/expiry-alerts', alertController.getExpiryAlerts);

// GET Alert by ID
router.get('/:id', alertController.getAlertById);

// RESOLVE Alert
router.put('/:id/resolve', authMiddleware, alertController.resolveAlert);

// UPDATE Alert
router.put('/:id', alertController.updateAlert);

// DELETE Alert
router.delete('/:id', alertController.deleteAlert);

module.exports = router;