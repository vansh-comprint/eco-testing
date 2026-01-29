/**
 * API Error Types
 * Mirrors the backend exception hierarchy from eco-back/app/utils/exceptions.py
 *
 * Backend exceptions:
 * - AuthenticationError (401)
 * - AuthorizationError (403)
 * - NotFoundError (404)
 * - ValidationError (400)
 * - ConflictError (409)
 * - BusinessLogicError (422)
 * - DatabaseError (500)
 * - ExternalServiceError (503)
 */

/** Base error class for all API errors */
export class ApiError extends Error {
  code: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/** Authentication failed (401) - Invalid or expired credentials */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, 401, details);
    this.name = 'AuthenticationError';
  }
}

/** Authorization failed (403) - User doesn't have permission */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied', details?: Record<string, unknown>) {
    super(message, 403, details);
    this.name = 'AuthorizationError';
  }
}

/** Resource not found (404) */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', details?: Record<string, unknown>) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

/** Validation error (400) - Invalid input data */
export class ValidationError extends ApiError {
  errors?: Array<{ field: string; message: string; type?: string }>;

  constructor(
    message: string = 'Validation failed',
    errors?: Array<{ field: string; message: string; type?: string }>,
    details?: Record<string, unknown>
  ) {
    super(message, 400, details);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/** Conflict error (409) - Resource already exists or state conflict */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

/** Business logic error (422) - Operation not allowed due to business rules */
export class BusinessLogicError extends ApiError {
  constructor(message: string = 'Operation not allowed', details?: Record<string, unknown>) {
    super(message, 422, details);
    this.name = 'BusinessLogicError';
  }
}

/** Database error (500) - Database operation failed */
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database error', details?: Record<string, unknown>) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

/** External service error (503) - Third-party service unavailable */
export class ExternalServiceError extends ApiError {
  constructor(message: string = 'External service unavailable', details?: Record<string, unknown>) {
    super(message, 503, details);
    this.name = 'ExternalServiceError';
  }
}

/** Network error - Client-side network failure */
export class NetworkError extends ApiError {
  constructor(message: string = 'Network error', details?: Record<string, unknown>) {
    super(message, 0, details);
    this.name = 'NetworkError';
  }
}

/**
 * Create appropriate error class based on HTTP status code
 */
export function createApiError(
  code: number,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  switch (code) {
    case 401:
      return new AuthenticationError(message, details);
    case 403:
      return new AuthorizationError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 409:
      return new ConflictError(message, details);
    case 422:
      return new BusinessLogicError(message, details);
    case 500:
      return new DatabaseError(message, details);
    case 503:
      return new ExternalServiceError(message, details);
    case 0:
      return new NetworkError(message, details);
    default:
      if (code >= 400 && code < 500) {
        return new ValidationError(message, undefined, details);
      }
      return new ApiError(message, code, details);
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guards for specific error types
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
