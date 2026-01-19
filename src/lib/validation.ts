// Input validation utilities

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate password complexity
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }

  return { valid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { valid: false, error: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

/**
 * Sanitize and validate full name
 */
export const validateFullName = (name: string): ValidationResult => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }

  return { valid: true };
};

/**
 * Sanitize text input by trimming whitespace
 */
export const sanitizeInput = (input: string): string => {
  return input.trim();
};

/**
 * Sanitize email by trimming and converting to lowercase
 */
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};
