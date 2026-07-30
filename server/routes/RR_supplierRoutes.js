const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/RR_supplierController');
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleGuard');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Configure multer storage for supplier documents
const docUploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(docUploadDir)) fs.mkdirSync(docUploadDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(auth);

router.post('/',               ctrl.createSupplier);
router.get('/',                ctrl.getAllSuppliers);
router.get('/:id',             ctrl.getSupplierById);
router.put('/:id',             ctrl.updateSupplier);
router.patch('/:id/status',    role(['admin', 'manager']), ctrl.updateSupplierStatus);
router.put('/:id/rating',      role(['admin', 'manager']), ctrl.updateSupplierRating);
router.delete('/:id',          role(['admin', 'manager']), ctrl.deleteSupplier);
router.get('/:id/statement',   ctrl.getSupplierStatement);
router.get('/:id/statement/pdf', ctrl.downloadStatementPDF);
router.post('/:id/statement/email', ctrl.emailSupplierStatement);

// Supplier Documents routes
router.get('/:id/documents', ctrl.getSupplierDocuments);
router.post('/:id/documents', docUpload.single('file'), ctrl.uploadSupplierDocument);
router.delete('/:id/documents/:docId', ctrl.deleteSupplierDocument);

module.exports = router;
