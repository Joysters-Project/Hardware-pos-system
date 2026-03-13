const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// CREATE Department
router.post('/', departmentController.createDepartment);

// GET All Departments
router.get('/', departmentController.getAllDepartments);

// GET Department by ID
router.get('/:id', departmentController.getDepartmentById);

// UPDATE Department
router.put('/:id', departmentController.updateDepartment);

// DELETE Department
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;