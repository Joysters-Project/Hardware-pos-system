const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// CREATE Employee
router.post('/', employeeController.createEmployee);

// GET All Employees
router.get('/', employeeController.getAllEmployees);

// GET Employee by ID
router.get('/:id', employeeController.getEmployeeById);

// UPDATE Employee
router.put('/:id', employeeController.updateEmployee);

// DELETE Employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;