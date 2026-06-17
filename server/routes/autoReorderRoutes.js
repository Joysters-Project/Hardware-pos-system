const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/autoReorderController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/suggestions', ctrl.getSuggestions);
router.put('/suggestions/:id/approve', ctrl.approveSuggestion);
router.put('/suggestions/:id/reject', ctrl.rejectSuggestion);
router.post('/suggestions/:id/convert', ctrl.convertToPO);
router.post('/trigger', ctrl.triggerCheck);

module.exports = router;
