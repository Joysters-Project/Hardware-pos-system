const express = require('express');
const router = express.Router();
const c = require('../controllers/assetController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', c.getAllAssets);
router.get('/:id', c.getAssetById);
router.post('/', authMiddleware, c.createAsset);
router.put('/:id', authMiddleware, c.updateAsset);
router.patch('/:id/dispose', authMiddleware, c.disposeAsset);
router.delete('/:id', authMiddleware, c.deleteAsset);

module.exports = router;
