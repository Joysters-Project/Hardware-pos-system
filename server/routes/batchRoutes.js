const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batchController');

router.post('/receive',                ctrl.receiveOrderItem);
router.get('/',                        ctrl.getAllBatches);
router.get('/product/:productId',      ctrl.getBatchesByProduct);
router.get('/:id',                     ctrl.getBatchById);
router.post('/:id/dispose',            ctrl.disposeBatch);
router.post('/refresh-statuses',       ctrl.refreshAllStatuses);

module.exports = router;
