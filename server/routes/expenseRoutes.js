const express = require('express');
const router = express.Router();
const c = require('../controllers/expenseController');

router.get('/', c.getAllExpenses);
router.get('/summary', c.getExpenseSummary);
router.get('/:id', c.getExpenseById);
router.post('/', c.createExpense);
router.put('/:id', c.updateExpense);
router.delete('/:id', c.deleteExpense);

module.exports = router;
