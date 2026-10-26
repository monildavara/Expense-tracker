# 💰 AI Expense Tracker (Beginner Friendly)

A complete full-stack web application that lets you track your expenses either by typing plain sentences (e.g., *"I spent 250 on lunch with friends"*) or by filling out a manual form.

---

## 📁 Project Structure

```text
├── frontend/
│   ├── index.html           # Main user interface
│   ├── style.css            # Modern styling, responsive layout & colors
│   └── script.js            # Calls the backend API and updates the page
│
├── backend/
│   ├── server.js            # Express server entry point (port 3000)
│   ├── routes/
│   │   └── expenses.js      # REST API route endpoints
│   ├── controllers/
│   │   └── expensesController.js # Handles adding, editing, deleting & summary
│   ├── services/
│   │   └── aiService.js     # AI parsing, prompt engineering, retries & validation
│   ├── utils/
│   │   ├── redact.js        # Hides emails & phone numbers before AI calls
│   │   └── logger.js        # Logs inputs, AI replies, tokens & validation
│   ├── data/
│   │   ├── expenses.json    # JSON storage file (no database needed!)
│   │   └── ai_logs.json     # Detailed audit logs of every AI request
│   ├── tests/
│   │   ├── goldenSet.json   # 10 test benchmark sentences
│   │   └── runEvals.js      # Automated test runner for AI accuracy
│   ├── .env.example         # Example environment configuration
│   ├── .env                 # Your secret API key file (never committed)
│   └── package.json         # Project dependencies and test scripts
└── README.md                # This beginner guide
```

---

## 🚀 Quick Start Guide (Step-by-Step)

### Step 1: Open Terminal
Open PowerShell or your command prompt in this project folder:
```bash
cd "c:\Users\dell\OneDrive\Desktop\new project"
```

### Step 2: Install Dependencies (Already Done)
Inside the `backend` folder:
```bash
cd backend
npm install
```

### Step 3: Configure Your AI API Key
Open [`backend/.env`](file:///c:/Users/dell/OneDrive/Desktop/new%20project/backend/.env) in any text editor.

You can use **Google Gemini** (recommended & free) or **OpenAI**:
```env
# Option A: Google Gemini (Get free key at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Option B: OpenAI
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4o-mini
```

> **Note:** If no API key is provided, the app will run in **Smart Fallback Mode**, allowing you to test all features and evals offline without errors!

### Step 4: Start the Server
From the `backend` directory, run:
```bash
node server.js
```
You will see:
```text
===============================================
  AI Expense Tracker Server running!
  Local URL: http://localhost:3000
  API Base:  http://localhost:3000/api/expenses
===============================================
```

### Step 5: Open the App
Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running the Evals Benchmark (Golden Set)

The project includes an automated evaluation suite testing 10 sample sentences, including tricky edge cases:
- Relative dates (*"yesterday"*)
- Abstention (*no amount specified*)
- Numbers written in words (*"fifteen dollars"*)
- Sensitive data redaction (*emails and phone numbers*)
- Prompt injection security attempts

To run the evals, execute:
```bash
cd backend
npm run test:evals
```

---

## 🛡️ How the 10 AI Rules Protect You

1. **Structured Output**: AI replies strictly in JSON: `{"found": boolean, "amount": number, "category": string, "description": string, "date": "YYYY-MM-DD"}`.
2. **Date Context**: Today's reference date is injected so relative dates like "yesterday" are converted properly.
3. **Abstention**: If you say *"Had lunch with Sarah"* without an amount, AI replies `found: false` and never invents numbers.
4. **Stable Temperature**: `temperature: 0` ensures deterministic, consistent extraction.
5. **Prompt Injection Defense**: User text is treated strictly as **data**, not instructions.
6. **Schema Validation & Retry**: Code verifies amounts are positive, categories are in the allowed list (`Food`, `Travel`, `Bills`, `Shopping`, `Health`, `Other`), and dates are valid. If invalid, it asks the AI to correct itself once.
7. **Code Control**: The AI only suggests the expense; your code verifies and writes to `expenses.json`.
8. **Redaction**: Emails and phone numbers are scrubbed before reaching the LLM API.
9. **Audit Logging**: Every AI call records the input, output, duration, and tokens used in [`backend/data/ai_logs.json`](file:///c:/Users/dell/OneDrive/Desktop/new%20project/backend/data/ai_logs.json).
10. **Rate Limiting**: Protects your API bill by limiting AI requests to 10 calls per minute per user.
