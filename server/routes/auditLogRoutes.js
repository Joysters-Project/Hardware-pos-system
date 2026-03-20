const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

// CREATE Audit Log
router.post('/', auditLogController.createAuditLog);

// GET All Audit Logs
router.get('/', auditLogController.getAllAuditLogs);

// GET Audit Log by ID
router.get('/:id', auditLogController.getAuditLogById);

// UPDATE Audit Log
router.put('/:id', auditLogController.updateAuditLog);

// DELETE Audit Log
router.delete('/:id', auditLogController.deleteAuditLog);

module.exports = router;