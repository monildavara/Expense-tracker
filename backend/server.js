const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, style.css, script.js)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);

// Root fallback to frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start Server after connecting to PostgreSQL
async function startServer() {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  AI Expense Tracker Server running!`);
      console.log(`  Database:  PostgreSQL (database: ${process.env.DB_NAME || 'postgres'})`);
      console.log(`  Local URL: http://localhost:${PORT}`);
      console.log(`  API Base:  http://localhost:${PORT}/api/expenses`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Fatal: Could not initialize database:', err.message);
    process.exit(1);
  }
}

startServer();
