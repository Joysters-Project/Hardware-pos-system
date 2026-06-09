const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auditLogController');
const auth    = require('../middleware/authMiddleware');
const guard   = require('../middleware/roleGuard');

const adminOnly = [auth, guard(['Admin'])];

router.get('/',               ...adminOnly, ctrl.getAllAuditLogs);
router.get('/actions',        ...adminOnly, ctrl.getActions);
router.get('/user/:userId',   ...adminOnly, ctrl.getLogsByUser);
router.get('/:id',            ...adminOnly, ctrl.getAuditLogById);
router.delete('/:id',         ...adminOnly, ctrl.deleteAuditLog);

module.exports = router;
