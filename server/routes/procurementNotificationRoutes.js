const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurementNotificationController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/unread-count', ctrl.getUnreadCount);
router.put('/mark-read', ctrl.markAsRead);
router.put('/archive', ctrl.archive);
router.get('/', ctrl.getAll);

module.exports = router;
