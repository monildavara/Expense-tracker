/**
 * Evaluation Runner (Evals)
 * Runs goldenSet test cases through the AI Service to measure accuracy,
 * schema compliance, abstention, and security protection.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { parseExpenseFromText } = require('../services/aiService');

const GOLDEN_SET_PATH = path.join(__dirname, 'goldenSet.json');

async function runEvals() {
  console.log('======================================================');
  console.log('  RUNNING EVALUATION SUITE (tests/goldenSet.json)     ');
  console.log('======================================================\n');

  if (!fs.existsSync(GOLDEN_SET_PATH)) {
    console.error(`Error: goldenSet file not found at ${GOLDEN_SET_PATH}`);
    process.exit(1);
  }

  const testCases = JSON.parse(fs.readFileSync(GOLDEN_SET_PATH, 'utf-8'));
  const fixedReferenceDate = '2026-10-24'; // Fixed reference date for deterministic testing

  // Calculate yesterday's date string
  const refDateObj = new Date(fixedReferenceDate);
  refDateObj.setDate(refDateObj.getDate() - 1);
  const expectedYesterday = refDateObj.toISOString().split('T')[0];

  let passedCount = 0;
  const results = [];

  for (const tc of testCases) {
    process.stdout.write(`Test #${tc.id} [${tc.description}] ... `);

    try {
      const result = await parseExpenseFromText(tc.input, fixedReferenceDate);
      let passed = true;
      const failureReasons = [];

      if (!result.success) {
        passed = false;
        failureReasons.push(`Service call returned success: false (${result.error})`);
      } else {
        const data = result.data;

        // 1. Check "found" flag
        if (data.found !== tc.expected.found) {
          passed = false;
          failureReasons.push(`Expected found: ${tc.expected.found}, got: ${data.found}`);
        }

        // 2. If expected found is true, check amount, category, date
        if (tc.expected.found === true) {
          if (Number(data.amount) !== Number(tc.expected.amount)) {
            passed = false;
            failureReasons.push(`Expected amount: ${tc.expected.amount}, got: ${data.amount}`);
          }

          if (data.category !== tc.expected.category) {
            passed = false;
            failureReasons.push(`Expected category: ${tc.expected.category}, got: ${data.category}`);
          }

          if (tc.expected.relativeDate === 'yesterday') {
            if (data.date !== expectedYesterday) {
              passed = false;
              failureReasons.push(`Expected yesterday's date: ${expectedYesterday}, got: ${data.date}`);
            }
          } else if (tc.expected.relativeDate === 'today') {
            if (data.date !== fixedReferenceDate) {
              passed = false;
              failureReasons.push(`Expected today's date: ${fixedReferenceDate}, got: ${data.date}`);
            }
          }
        }
      }

      if (passed) {
        passedCount++;
        console.log('✓ PASS');
        results.push({ id: tc.id, status: 'PASS', input: tc.input });
      } else {
        console.log('✗ FAIL');
        console.log(`    Reasons: ${failureReasons.join('; ')}`);
        results.push({ id: tc.id, status: 'FAIL', reasons: failureReasons, input: tc.input });
      }
    } catch (err) {
      console.log('✗ ERROR');
      console.log(`    Exception: ${err.message}`);
      results.push({ id: tc.id, status: 'ERROR', error: err.message, input: tc.input });
    }
  }

  console.log('\n======================================================');
  console.log(`  EVALUATION SUMMARY: ${passedCount} / ${testCases.length} Passed (${Math.round((passedCount / testCases.length) * 100)}%)`);
  console.log('======================================================\n');

  if (passedCount === testCases.length) {
    console.log('🎉 All golden set evals passed successfully!\n');
    process.exit(0);
  } else {
    console.warn('⚠️  Some evals failed. Check details above.\n');
    process.exit(1);
  }
}

runEvals();
