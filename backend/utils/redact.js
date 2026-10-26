/**
 * Redaction Utility
 * Hides sensitive personal data (email addresses and phone numbers)
 * before sending user text to external AI models.
 */

function redactSensitiveData(text) {
  if (typeof text !== 'string') return '';

  // 1. Redact email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
  let redacted = text.replace(emailRegex, '[REDACTED_EMAIL]');

  // 2. Redact phone numbers
  // Matches:
  // - Formats like +1-555-0199 or +1-555-123-4567 or +91 9876543210
  // - (555) 019-2834, 555-019-2834, 555-0199
  // - 10-12 continuous digit numbers
  const phoneRegex = /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b|\b\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b|\b\d{10,12}\b/g;
  redacted = redacted.replace(phoneRegex, '[REDACTED_PHONE]');

  return redacted;
}

module.exports = {
  redactSensitiveData
};
