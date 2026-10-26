/**
 * Categories Controller
 * Handles dynamic category listing and creation with validation.
 */

const db = require('../db');

/**
 * GET /api/categories
 * List all categories
 */
async function getCategories(req, res) {
  try {
    const result = await db.query('SELECT name FROM categories ORDER BY id ASC');
    const categories = result.rows.map((row) => row.name);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories: ' + err.message });
  }
}

/**
 * POST /api/categories
 * Add a new custom category.
 * Rules:
 * - Automatically capitalizes the first letter
 * - Validates if category already exists (case-insensitive)
 * - If exists: returns error "This category already exists."
 */
async function addCategory(req, res) {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const trimmed = name.trim();
    // Capitalize first letter automatically
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    // Case-insensitive check if category already exists
    const check = await db.query('SELECT name FROM categories WHERE LOWER(name) = LOWER($1)', [trimmed]);

    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'This category already exists.' });
    }

    await db.query('INSERT INTO categories (name) VALUES ($1)', [formatted]);

    // Return the updated list of categories
    const allRes = await db.query('SELECT name FROM categories ORDER BY id ASC');
    const updatedList = allRes.rows.map((r) => r.name);

    res.status(201).json({
      message: `Category "${formatted}" added successfully!`,
      category: formatted,
      categories: updatedList
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add category: ' + err.message });
  }
}

module.exports = {
  getCategories,
  addCategory
};
