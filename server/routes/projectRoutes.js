const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');

// All routes require authentication
router.use(authMiddleware);

// ── Active projects list — cashier, admin, manager ────────────────────────────
router.get('/active', ctrl.getActiveProjects);

// ── Reports — admin and manager only ─────────────────────────────────────────
router.get('/report/daily',   roleGuard(['Admin', 'Manager', 'Cashier']), ctrl.getDailyReport);
router.delete('/report/daily/product/:productId', roleGuard(['Admin', 'Manager']), ctrl.deleteTodayProductSales);
router.get('/report/monthly', roleGuard(['Admin', 'Manager']), ctrl.getMonthlyReport);
router.get('/report/yearly',  roleGuard(['Admin', 'Manager']), ctrl.getYearlyReport);

// ── Project CRUD — admin and manager only ────────────────────────────────────
router.get('/',    roleGuard(['Admin', 'Manager']), ctrl.getAllProjects);
router.post('/',   roleGuard(['Admin', 'Manager']), ctrl.createProject);
router.get('/:id', roleGuard(['Admin', 'Manager', 'Cashier']), ctrl.getProjectById);
router.put('/:id', roleGuard(['Admin', 'Manager']), ctrl.updateProject);
router.delete('/:id', roleGuard(['Admin']), ctrl.deleteProject);

// ── Project items — cashier adds, admin/manager can remove ───────────────────
router.get('/:id/items',          ctrl.getProjectItems);
router.post('/items',             ctrl.addProjectItem);
router.delete('/items/:itemId',   roleGuard(['Admin', 'Manager', 'Cashier']), ctrl.deleteProjectItem);

module.exports = router;
