/**
 * Centralized error handling system for better error management across the application
 * Implements custom error types with proper TypeScript support
 */

// Base application error class
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// API-specific error with status code
export class ApiError extends AppError {
  statusCode: number;

  constructor(
    statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static isBadRequest(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode === 400;
  }

  static isUnauthorized(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode === 401;
  }

  static isForbidden(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode === 403;
  }

  static isNotFound(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode === 404;
  }

  static isRateLimit(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode === 429;
  }

  static isServerError(error: unknown): error is ApiError {
    return error instanceof ApiError && error.statusCode >= 500;
  }
}

// Network-related errors
export class NetworkError extends AppError {
  constructor(message = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

// Timeout errors
export class TimeoutError extends AppError {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// Rate limit errors
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// Authentication errors
export class AuthError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Helper function to extract error message from any error type
 * Useful for safely displaying error messages to users
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || 'An unknown error occurred');
}

/**
 * Safely converts any error to a serializable object
 * Useful for logging and analytics
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof ApiError ? { statusCode: error.statusCode, data: error.data } : {}),
      ...(error instanceof ValidationError ? { field: error.field } : {}),
    };
  }

  return { message: String(error || 'Unknown error') };
}

/**
 * Universal error handler for consistent error handling
 * Can be used with both sync and async functions
 */
export async function handleError<T>(
  promise: Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<[T | null, unknown]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    }
    return [null, error];
  }
}
