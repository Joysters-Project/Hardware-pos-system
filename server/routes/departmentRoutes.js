const express = require('express');
const router = express.Router();
const c = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', c.getAllDepartments);
router.get('/:id', c.getDepartmentById);
router.post('/', authMiddleware, c.createDepartment);
router.put('/:id', authMiddleware, c.updateDepartment);
router.delete('/:id', authMiddleware, c.deleteDepartment);

module.exports = router;
