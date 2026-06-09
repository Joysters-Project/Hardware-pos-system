const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentController');

router.get('/', c.getAllDepartments);
router.get('/:id', c.getDepartmentById);
router.post('/', c.createDepartment);
router.put('/:id', c.updateDepartment);
router.delete('/:id', c.deleteDepartment);

module.exports = router;
