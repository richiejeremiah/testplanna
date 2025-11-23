/**
 * Test Helper Utility - Created for workflow automation testing
 * This file contains utility functions that will be analyzed by the AI workflow
 */

/**
 * Validates user input and returns sanitized data
 * @param {string} input - User input string
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with sanitized data
 */
export function validateUserInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  const {
    maxLength = 1000,
    minLength = 1,
    allowSpecialChars = true,
    trimWhitespace = true
  } = options;

  // Trim whitespace if requested
  let sanitized = trimWhitespace ? input.trim() : input;

  // Check length constraints
  if (sanitized.length < minLength) {
    throw new Error(`Input must be at least ${minLength} characters`);
  }

  if (sanitized.length > maxLength) {
    throw new Error(`Input must not exceed ${maxLength} characters`);
  }

  // Remove special characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  return {
    isValid: true,
    sanitized,
    originalLength: input.length,
    sanitizedLength: sanitized.length
  };
}

/**
 * Formats workflow status for display
 * @param {string} status - Workflow status
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Formatted status object
 */
export function formatWorkflowStatus(status, metadata = {}) {
  const validStatuses = ['pending', 'running', 'completed', 'failed'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  const statusConfig = {
    pending: { color: 'gray', icon: '⏳', priority: 1 },
    running: { color: 'blue', icon: '🔄', priority: 2 },
    completed: { color: 'green', icon: '✅', priority: 3 },
    failed: { color: 'red', icon: '❌', priority: 4 }
  };

  const config = statusConfig[status];

  return {
    status,
    displayText: status.charAt(0).toUpperCase() + status.slice(1),
    color: config.color,
    icon: config.icon,
    priority: config.priority,
    timestamp: metadata.timestamp || new Date().toISOString(),
    ...metadata
  };
}

/**
 * Calculates test coverage percentage
 * @param {number} passed - Number of passed tests
 * @param {number} total - Total number of tests
 * @returns {Object} - Coverage calculation result
 */
export function calculateTestCoverage(passed, total) {
  if (total === 0) {
    return {
      percentage: 0,
      passed: 0,
      total: 0,
      status: 'no_tests'
    };
  }

  if (passed < 0 || total < 0) {
    throw new Error('Test counts must be non-negative');
  }

  if (passed > total) {
    throw new Error('Passed tests cannot exceed total tests');
  }

  const percentage = Math.round((passed / total) * 100);

  return {
    percentage,
    passed,
    total,
    failed: total - passed,
    status: percentage === 100 ? 'perfect' : percentage >= 80 ? 'good' : percentage >= 60 ? 'acceptable' : 'poor'
  };
}

