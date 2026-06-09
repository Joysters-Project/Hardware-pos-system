const express = require('express');
const router = express.Router();
const c = require('../controllers/assetController');

router.get('/', c.getAllAssets);
router.get('/:id', c.getAssetById);
router.post('/', c.createAsset);
router.put('/:id', c.updateAsset);
router.patch('/:id/dispose', c.disposeAsset);
router.delete('/:id', c.deleteAsset);

module.exports = router;
