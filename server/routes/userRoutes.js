const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// CREATE User
router.post('/', userController.createUser);

// GET All Users
router.get('/', userController.getAllUsers);

// GET User by ID
router.get('/:id', userController.getUserById);

// UPDATE User
router.put('/:id', userController.updateUser);

// DELETE User
router.delete('/:id', userController.deleteUser);

module.exports = router;