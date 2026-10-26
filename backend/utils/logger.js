/**
 * AI Call Logger Utility
 * Records every AI request and response with redaction, timing, tokens, and validation status.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'ai_logs.json');

function logAiCall({ inputRedacted, aiReply, tokensUsed = 0, timeTakenMs = 0, validationPassed = false, error = null }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    inputRedacted,
    aiReply,
    tokensUsed,
    timeTakenMs,
    validationPassed,
    error: error ? String(error) : null
  };

  // 1. Log to console for real-time visibility in terminal
  console.log('--------------------------------------------------');
  console.log(`[AI Logger] ${logEntry.timestamp}`);
  console.log(`Input (Redacted): "${logEntry.inputRedacted}"`);
  console.log(`Time Taken: ${logEntry.timeTakenMs}ms | Tokens: ${logEntry.tokensUsed} | Valid: ${logEntry.validationPassed}`);
  if (logEntry.error) {
    console.log(`Error: ${logEntry.error}`);
  }
  console.log('--------------------------------------------------');

  // 2. Persist to backend/data/ai_logs.json
  try {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const fileData = fs.readFileSync(LOG_FILE, 'utf-8');
      if (fileData.trim()) {
        logs = JSON.parse(fileData);
      }
    }
    logs.push(logEntry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AI Logger Error] Failed to write log to file:', err.message);
  }

  return logEntry;
}

module.exports = {
  logAiCall
};
