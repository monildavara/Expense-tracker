/**
 * PostgreSQL Database Module
 * Connects to PostgreSQL using pg Pool and initializes tables.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'postgres'
});

/**
 * Initialize PostgreSQL tables and default data.
 */
async function initDb() {
  try {
    const client = await pool.connect();

    // 1. Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed default categories
    const defaultCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Other'];
    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [cat]
      );
    }

    // 3. Create expenses table with auto-incrementing SERIAL ID
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(10, 2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. If expenses table was previously created with varchar ID, migrate to SERIAL
    const colCheck = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'expenses' AND column_name = 'id'
    `);
    if (colCheck.rows.length > 0 && !['integer', 'bigint'].includes(colCheck.rows[0].data_type)) {
      console.log('[Database] Migrating expenses.id from varchar to SERIAL auto-increment...');
      await client.query(`
        CREATE TABLE expenses_new (
          id SERIAL PRIMARY KEY,
          amount NUMERIC(10, 2) NOT NULL,
          category VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          date DATE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO expenses_new (amount, category, description, date, created_at)
        SELECT amount, category, description, date, created_at 
        FROM expenses 
        ORDER BY created_at ASC;
        DROP TABLE expenses;
        ALTER TABLE expenses_new RENAME TO expenses;
      `);
    }

    // 5. Ensure any custom category existing in expenses is in categories table
    await client.query(`
      INSERT INTO categories (name)
      SELECT DISTINCT category FROM expenses
      ON CONFLICT (name) DO NOTHING;
    `);

    // 6. Check if table is empty, migrate existing JSON data if needed
    const countRes = await client.query('SELECT COUNT(*) as count FROM expenses');
    const rowCount = parseInt(countRes.rows[0].count, 10);

    const jsonPath = path.join(__dirname, 'data', 'expenses.json');
    if (rowCount === 0 && fs.existsSync(jsonPath)) {
      try {
        const fileData = fs.readFileSync(jsonPath, 'utf-8');
        if (fileData.trim()) {
          const jsonExpenses = JSON.parse(fileData);
          for (const exp of jsonExpenses) {
            await client.query(
              `INSERT INTO expenses (amount, category, description, date)
               VALUES ($1, $2, $3, $4)`,
              [exp.amount, exp.category, exp.description, exp.date]
            );
          }
          console.log(`[Database] Migrated ${jsonExpenses.length} existing expenses from expenses.json into PostgreSQL.`);
        }
      } catch (err) {
        console.warn('[Database] Could not migrate initial JSON data:', err.message);
      }
    }

    client.release();
    console.log('[Database] Connected to PostgreSQL successfully!');
    return true;
  } catch (err) {
    console.error('[Database] PostgreSQL Connection Error:', err.message);
    throw err;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
  pool
};
