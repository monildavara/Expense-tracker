/**
 * Expenses Controller (PostgreSQL Version)
 * Handles CRUD operations with dynamic category support.
 */

const db = require('../db');
const { parseExpenseFromText } = require('../services/aiService');

/**
 * GET /api/expenses
 * List all expenses from PostgreSQL, with optional query filters:
 * - ?category=Food
 * - ?month=YYYY-MM
 */
async function getAllExpenses(req, res) {
  try {
    const { category, month } = req.query;
    const conditions = [];
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`LOWER(category) = LOWER($${params.length})`);
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}%`);
      conditions.push(`TO_CHAR(date, 'YYYY-MM-DD') LIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        id, 
        CAST(amount AS DOUBLE PRECISION) as amount, 
        category, 
        description, 
        TO_CHAR(date, 'YYYY-MM-DD') as date
      FROM expenses
      ${whereClause}
      ORDER BY date DESC, created_at DESC
    `;

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses from database: ' + err.message });
  }
}

/**
 * GET /api/expenses/summary
 * Returns overall total and category-wise breakdown from PostgreSQL.
 * Supports optional ?month=YYYY-MM filter.
 */
async function getSummary(req, res) {
  try {
    const { month } = req.query;
    const conditions = [];
    const params = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}%`);
      conditions.push(`TO_CHAR(date, 'YYYY-MM-DD') LIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Overall total and count (respecting month filter if given)
    const totalRes = await db.query(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0)::float as total 
      FROM expenses
      ${whereClause}
    `, params);

    const totalCount = parseInt(totalRes.rows[0].count, 10);
    const overallTotal = Math.round(Number(totalRes.rows[0].total) * 100) / 100;

    // 2. Load all known categories from categories table
    const allCatsRes = await db.query('SELECT name FROM categories ORDER BY id ASC');
    const byCategory = {};
    allCatsRes.rows.forEach((r) => {
      byCategory[r.name] = 0;
    });

    // 3. Breakdown by category
    const catRes = await db.query(`
      SELECT 
        category, 
        COALESCE(SUM(amount), 0)::float as total 
      FROM expenses 
      ${whereClause}
      GROUP BY category
    `, params);

    catRes.rows.forEach((row) => {
      const cat = row.category;
      const amt = Math.round(Number(row.total) * 100) / 100;
      byCategory[cat] = amt;
    });

    res.json({
      overallTotal,
      byCategory,
      totalCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate summary: ' + err.message });
  }
}

/**
 * POST /api/expenses
 * Add an expense manually.
 */
async function addExpense(req, res) {
  try {
    const { amount, category, description, date } = req.body;

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const trimmedCategory = category.trim();
    const formattedCategory = trimmedCategory.charAt(0).toUpperCase() + trimmedCategory.slice(1);

    // Ensure category exists in categories table
    await db.query(
      `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [formattedCategory]
    );

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD.' });
    }

    const roundedAmount = Math.round(numAmount * 100) / 100;

    // PostgreSQL auto-increments the id column via SERIAL
    const result = await db.query(
      `INSERT INTO expenses (amount, category, description, date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, CAST(amount AS DOUBLE PRECISION) as amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date`,
      [roundedAmount, formattedCategory, description.trim(), date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense to database: ' + err.message });
  }
}

/**
 * POST /api/expenses/ai
 * Natural language expense input via AI.
 */
async function addExpenseViaAi(req, res) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Please enter expense text.' });
    }

    const aiResult = await parseExpenseFromText(text.trim());

    if (!aiResult.success) {
      return res.status(500).json({
        error: aiResult.error || 'AI parsing failed. Please try again.'
      });
    }

    const { found, amount, category, description, date } = aiResult.data;

    if (!found) {
      return res.status(422).json({
        found: false,
        error: 'AI could not find a clear expense amount in your text. Please mention the amount spent.'
      });
    }

    const formattedCategory = category.trim().charAt(0).toUpperCase() + category.trim().slice(1);
    await db.query(
      `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [formattedCategory]
    );

    const roundedAmount = Math.round(Number(amount) * 100) / 100;

    // PostgreSQL auto-increments the id column via SERIAL
    const result = await db.query(
      `INSERT INTO expenses (amount, category, description, date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, CAST(amount AS DOUBLE PRECISION) as amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date`,
      [roundedAmount, formattedCategory, description.trim(), date]
    );

    res.status(201).json({
      message: 'Expense extracted and added successfully!',
      expense: result.rows[0],
      aiMetadata: {
        tokensUsed: aiResult.tokensUsed,
        timeTakenMs: aiResult.timeTakenMs
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error processing AI expense: ' + err.message });
  }
}

/**
 * PUT /api/expenses/:id
 * Edit an existing expense in PostgreSQL.
 */
async function updateExpense(req, res) {
  try {
    const { id } = req.params;
    const { amount, category, description, date } = req.body;

    const checkRes = await db.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const updates = [];
    const values = [];

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number.' });
      }
      values.push(Math.round(numAmount * 100) / 100);
      updates.push(`amount = $${values.length}`);
    }

    if (category !== undefined) {
      const formattedCategory = category.trim().charAt(0).toUpperCase() + category.trim().slice(1);
      await db.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [formattedCategory]
      );
      values.push(formattedCategory);
      updates.push(`category = $${values.length}`);
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'Description cannot be empty.' });
      }
      values.push(description.trim());
      updates.push(`description = $${values.length}`);
    }

    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD.' });
      }
      values.push(date);
      updates.push(`date = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.json(checkRes.rows[0]);
    }

    values.push(id);
    const updateSql = `
      UPDATE expenses
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, CAST(amount AS DOUBLE PRECISION) as amount, category, description, TO_CHAR(date, 'YYYY-MM-DD') as date
    `;

    const updateRes = await db.query(updateSql, values);
    res.json(updateRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense in database: ' + err.message });
  }
}

/**
 * DELETE /api/expenses/:id
 * Delete an expense from PostgreSQL.
 */
async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const deleteRes = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
  }
}

module.exports = {
  getAllExpenses,
  getSummary,
  addExpense,
  addExpenseViaAi,
  updateExpense,
  deleteExpense
};
