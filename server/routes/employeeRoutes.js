const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const c = require('../controllers/employeeController');

router.get('/', c.getAllEmployees);
router.get('/:id', c.getEmployeeById);
router.post('/', upload.single('profile_photo'), c.createEmployee);
router.put('/:id', upload.single('profile_photo'), c.updateEmployee);
router.delete('/:id', c.deleteEmployee);

module.exports = router;
