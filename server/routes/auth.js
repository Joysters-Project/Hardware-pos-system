const express = require('express');
const router = express.Router();
// Import the functions you wrote in the controller
const authController = require('../controllers/authController'); 

// When someone POSTs to /register, run the register function from controller
router.post('/register', authController.register);

// When someone POSTs to /login, run the login function from controller
router.post('/login', authController.login);

module.exports = router;