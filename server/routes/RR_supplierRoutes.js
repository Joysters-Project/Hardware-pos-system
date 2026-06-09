const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/RR_supplierController');
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleGuard');

router.use(auth);

router.post('/',               ctrl.createSupplier);
router.get('/',                ctrl.getAllSuppliers);
router.get('/:id',             ctrl.getSupplierById);
router.put('/:id',             ctrl.updateSupplier);
router.patch('/:id/status',    role(['admin', 'manager']), ctrl.updateSupplierStatus);
router.put('/:id/rating',      role(['admin', 'manager']), ctrl.updateSupplierRating);
router.get('/:id/statement',   ctrl.getSupplierStatement);
router.get('/:id/statement/pdf', ctrl.downloadStatementPDF);
// No DELETE route — deletion is prevented per requirements

module.exports = router;
