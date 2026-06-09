// Force immediate loading of environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const router = express.Router();
// Import the functions you wrote in the controller
const authController = require('../controllers/authController'); 
const authMiddleware = require('../middleware/authMiddleware'); 
const roleGuard = require('../middleware/roleGuard');    

// Simple signup endpoint for basic user registration
router.post('/signup', authController.simpleRegister);

// When someone POSTs to /register, run the register function from controller
//router.post('/register', authController.register);

// When someone POSTs to /login, run the login function from controller
router.post('/login', authController.login);

// When someone locked the system through invalid passwords, Admin also can unlock system
router.post('/unlock',authMiddleware,roleGuard(['Admin']),authController.unlockUser);

// logout route
router.post('/logout', authController.logout);

// reset password
router.post('/reset-password',authController.resetPassword);

module.exports = router;