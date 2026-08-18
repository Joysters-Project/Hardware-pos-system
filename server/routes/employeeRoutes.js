const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const c = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', c.getAllEmployees);
router.get('/:id', c.getEmployeeById);
router.post('/', authMiddleware, upload.single('profile_photo'), c.createEmployee);
router.put('/:id', authMiddleware, upload.single('profile_photo'), c.updateEmployee);
router.delete('/:id', authMiddleware, c.deleteEmployee);

module.exports = router;
