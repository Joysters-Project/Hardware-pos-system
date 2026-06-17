const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const userController = require('../controllers/userController');

router.get('/',              authMiddleware, userController.getOwnProfile);
router.put('/',              authMiddleware, upload.single('profile_photo'), userController.updateOwnProfile);
router.post('/change-password', authMiddleware, userController.changePassword);
router.delete('/photo',      authMiddleware, userController.deleteProfilePhoto);

module.exports = router;
