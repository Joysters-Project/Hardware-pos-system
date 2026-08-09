const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// CREATE User
router.post('/', authMiddleware, userController.createUser);

// GET All Users
router.get('/', authMiddleware, userController.getAllUsers);

// GET User by ID
router.get('/:id', authMiddleware, userController.getUserById);

// UPDATE User
router.put('/:id', authMiddleware, userController.updateUser);

// DELETE User
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;