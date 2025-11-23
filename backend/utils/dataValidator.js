/**
 * Data Validator Utility - Created for workflow automation testing (PR #2)
 * This utility provides data validation functions for testing the AI workflow system
 */

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {Object} - Validation result
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a non-empty string'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());

  return {
    isValid,
    email: email.trim(),
    error: isValid ? null : 'Invalid email format'
  };
}

/**
 * Validates and sanitizes user data
 * @param {Object} userData - User data object
 * @returns {Object} - Validation result with sanitized data
 */
export function validateUserData(userData) {
  if (!userData || typeof userData !== 'object') {
    throw new Error('User data must be an object');
  }

  const errors = [];
  const sanitized = {};

  // Validate and sanitize name
  if (userData.name) {
    if (typeof userData.name !== 'string' || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else {
      sanitized.name = userData.name.trim();
    }
  }

  // Validate email
  if (userData.email) {
    const emailValidation = validateEmail(userData.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    } else {
      sanitized.email = emailValidation.email;
    }
  }

  // Validate age (if provided)
  if (userData.age !== undefined) {
    const age = parseInt(userData.age);
    if (isNaN(age) || age < 0 || age > 150) {
      errors.push('Age must be a valid number between 0 and 150');
    } else {
      sanitized.age = age;
    }
  }

  return {
    isValid: errors.length === 0,
    data: sanitized,
    errors
  };
}

/**
 * Calculates percentage with proper rounding
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {Object} options - Options for calculation
 * @returns {Object} - Percentage calculation result
 */
export function calculatePercentage(value, total, options = {}) {
  if (total === 0) {
    return {
      percentage: 0,
      value: 0,
      total: 0,
      status: 'no_data'
    };
  }

  if (value < 0 || total < 0) {
    throw new Error('Values must be non-negative');
  }

  if (value > total) {
    throw new Error('Value cannot exceed total');
  }

  const { useFloor = false, decimals = 2 } = options;
  const rawPercentage = (value / total) * 100;
  
  // Use floor for conservative reporting (as CodeRabbit suggested)
  const percentage = useFloor 
    ? Math.floor(rawPercentage)
    : Math.round(rawPercentage * Math.pow(10, decimals)) / Math.pow(10, decimals);

  return {
    percentage,
    value,
    total,
    rawPercentage,
    status: percentage === 100 ? 'complete' : 
            percentage >= 80 ? 'good' : 
            percentage >= 60 ? 'acceptable' : 'poor'
  };
}

