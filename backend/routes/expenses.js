const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  getAllExpenses,
  getSummary,
  addExpense,
  addExpenseViaAi,
  updateExpense,
  deleteExpense
} = require('../controllers/expensesController');

// Rate limiter for AI endpoint: 10 calls per minute per client
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Too many AI requests! You are limited to 10 AI expense calls per minute to control costs. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// REST Routes
router.get('/', getAllExpenses);
router.get('/summary', getSummary);
router.post('/', addExpense);
router.post('/ai', aiRateLimiter, addExpenseViaAi);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
