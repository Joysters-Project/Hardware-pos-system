const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// CREATE Alert
router.post('/', alertController.createAlert);

// GET All Alerts
router.get('/', alertController.getAllAlerts);

// GET Alert by ID
router.get('/:id', alertController.getAlertById);

// UPDATE Alert
router.put('/:id', alertController.updateAlert);

// DELETE Alert
router.delete('/:id', alertController.deleteAlert);

module.exports = router;