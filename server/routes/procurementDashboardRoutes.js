const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/procurementDashboardController');
const auth    = require('../middleware/authMiddleware');

router.use(auth);
router.get('/', ctrl.getDashboardStats);

module.exports = router;
