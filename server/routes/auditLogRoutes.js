const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auditLogController');
const auth    = require('../middleware/authMiddleware');
const guard   = require('../middleware/roleGuard');

const adminOnly = [auth, guard(['Admin'])];

router.get('/',         ...adminOnly, ctrl.getAllAuditLogs);
router.get('/actions',  ...adminOnly, ctrl.getActions);
router.get('/archived', ...adminOnly, ctrl.getArchivedLogs);
router.get('/:id',      ...adminOnly, ctrl.getAuditLogById);

module.exports = router;
