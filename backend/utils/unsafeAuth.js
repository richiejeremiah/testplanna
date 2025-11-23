/**
 * Authentication Utility - Created for workflow testing (PR #3)
 * This file intentionally contains issues for CodeRabbit to detect:
 * - Security vulnerabilities
 * - Code quality issues
 * - Potential bugs
 */

/**
 * Authenticates user with password (INTENTIONAL SECURITY ISSUE)
 * @param {string} username - Username
 * @param {string} password - Plain text password (SECURITY ISSUE)
 * @returns {Object} - Auth result
 */
export function authenticateUser(username, password) {
  // SECURITY ISSUE: Password stored in plain text
  const users = {
    'admin': 'password123',
    'user': 'user123',
    'test': 'test123'
  };

  // SECURITY ISSUE: No password hashing
  if (users[username] === password) {
    return {
      success: true,
      token: 'secret-token-' + username, // SECURITY ISSUE: Weak token generation
      user: username
    };
  }

  return {
    success: false,
    error: 'Invalid credentials'
  };
}

/**
 * Validates API key (INTENTIONAL ISSUES)
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Validation result
 */
export function validateApiKey(apiKey) {
  // SECURITY ISSUE: Hardcoded API keys
  const validKeys = [
    'sk-1234567890abcdef',
    'sk-abcdef1234567890',
    'admin-key-12345'
  ];

  // CODE QUALITY ISSUE: No rate limiting
  // CODE QUALITY ISSUE: No logging of failed attempts
  return validKeys.includes(apiKey);
}

/**
 * Processes user input (INTENTIONAL VULNERABILITIES)
 * @param {string} input - User input
 * @returns {string} - Processed result
 */
export function processUserInput(input) {
  // SECURITY ISSUE: No input sanitization
  // SECURITY ISSUE: Potential XSS vulnerability
  const processed = input.replace(/<script>/gi, ''); // Weak sanitization
  
  // CODE QUALITY ISSUE: eval() usage (dangerous)
  try {
    // SECURITY ISSUE: Using eval() - major security risk
    if (input.includes('{{')) {
      return eval(`"${processed}"`); // CRITICAL SECURITY ISSUE
    }
  } catch (e) {
    // CODE QUALITY ISSUE: Silent error handling
  }

  return processed;
}

/**
 * Fetches user data (INTENTIONAL ISSUES)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export async function fetchUserData(userId) {
  // SECURITY ISSUE: SQL injection vulnerability (if using SQL)
  const query = `SELECT * FROM users WHERE id = '${userId}'`; // SQL INJECTION RISK
  
  // CODE QUALITY ISSUE: No error handling
  // CODE QUALITY ISSUE: No input validation
  const response = await fetch(`/api/users/${userId}`);
  
  // CODE QUALITY ISSUE: No response validation
  return response.json();
}

/**
 * Calculates discount (INTENTIONAL BUGS)
 * @param {number} price - Original price
 * @param {number} discountPercent - Discount percentage
 * @returns {number} - Final price
 */
export function calculateDiscount(price, discountPercent) {
  // BUG: No validation - can result in negative prices
  // BUG: No check for discount > 100%
  const discount = price * (discountPercent / 100);
  const finalPrice = price - discount;
  
  // BUG: Can return negative values
  return finalPrice;
}

/**
 * Saves user session (INTENTIONAL SECURITY ISSUES)
 * @param {Object} userData - User data to save
 */
export function saveUserSession(userData) {
  // SECURITY ISSUE: Storing sensitive data in localStorage
  // SECURITY ISSUE: No encryption
  localStorage.setItem('userSession', JSON.stringify(userData));
  
  // SECURITY ISSUE: Including password in session
  localStorage.setItem('userPassword', userData.password); // CRITICAL SECURITY ISSUE
}

/**
 * Validates credit card (INTENTIONAL ISSUES)
 * @param {string} cardNumber - Credit card number
 * @returns {boolean} - Validation result
 */
export function validateCreditCard(cardNumber) {
  // CODE QUALITY ISSUE: Weak validation
  // SECURITY ISSUE: No PCI compliance considerations
  if (cardNumber.length === 16) {
    return true; // BUG: Too simple, accepts any 16-digit string
  }
  return false;
}

/**
 * Generates password (INTENTIONAL WEAKNESSES)
 * @param {number} length - Password length
 * @returns {string} - Generated password
 */
export function generatePassword(length = 8) {
  // SECURITY ISSUE: Weak random number generation
  // SECURITY ISSUE: Uses Math.random() which is not cryptographically secure
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // SECURITY ISSUE: No uppercase, numbers, or special characters
  return password;
}

