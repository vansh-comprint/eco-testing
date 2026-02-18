/**
 * Error Handler Utilities
 * Provides centralized error handling for API responses
 */

import {
  ApiError,
  createApiError,
  isApiError,
  isAuthenticationError,
  isAuthorizationError,
  isNetworkError,
  isNotFoundError,
  isValidationError,
  NetworkError,
  ValidationError,
} from './errors';

/**
 * Error display configuration for toast notifications
 */
export interface ErrorDisplayConfig {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * Get user-friendly error display configuration based on error type
 */
export function getErrorDisplay(error: unknown): ErrorDisplayConfig {
  // Handle ApiError instances
  if (isApiError(error)) {
    const apiErr = error as ApiError;

    // Authentication errors
    if (isAuthenticationError(error)) {
      return {
        title: 'Session Expired',
        message: 'Please log in again to continue.',
        type: 'warning',
      };
    }

    // Authorization errors
    if (isAuthorizationError(error)) {
      return {
        title: 'Access Denied',
        message: apiErr.message || 'You do not have permission to perform this action.',
        type: 'error',
      };
    }

    // Not found errors
    if (isNotFoundError(error)) {
      return {
        title: 'Not Found',
        message: apiErr.message || 'The requested resource was not found.',
        type: 'warning',
      };
    }

    // Validation errors
    if (apiErr instanceof ValidationError) {
      let message = apiErr.message;

      // If we have field-specific errors, format them nicely
      if (apiErr.errors && apiErr.errors.length > 0) {
        const firstError = apiErr.errors[0];
        message = `${firstError.field}: ${firstError.message}`;
      }

      return {
        title: 'Validation Error',
        message,
        type: 'error',
      };
    }

    // Network errors
    if (isNetworkError(error)) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        type: 'error',
        duration: 6000,
      };
    }

    // Generic API errors
    return {
      title: 'Error',
      message: apiErr.message || 'An unexpected error occurred.',
      type: 'error',
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred.',
      type: 'error',
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      title: 'Error',
      message: error,
      type: 'error',
    };
  }

  // Fallback for unknown error types
  return {
    title: 'Error',
    message: 'An unexpected error occurred. Please try again.',
    type: 'error',
  };
}

/**
 * Parse API response into an ApiError if it represents an error
 */
export function parseApiError(response: {
  success: boolean;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  message?: string;
}): ApiError | null {
  if (response.success) {
    return null;
  }

  const rawCode = response.error?.code
    ? parseInt(response.error.code, 10)
    : 400;
  const code = isNaN(rawCode) ? 0 : rawCode;

  const message = response.error?.message || response.message || 'An error occurred';
  const details = response.error?.details;

  return createApiError(code, message, details);
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error should trigger a re-authentication flow
 */
export function shouldReauthenticate(error: unknown): boolean {
  return isAuthenticationError(error);
}

/**
 * Check if error is retryable (network issues, server errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  if (isApiError(error)) {
    // 5xx errors are typically retryable
    return error.code >= 500 && error.code < 600;
  }

  return false;
}

/**
 * Log error with context for debugging
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '[API Error]';

  if (isApiError(error)) {
    console.error(`${prefix} ${error.name} (${error.code}):`, error.message, error.details);
  } else if (error instanceof Error) {
    console.error(`${prefix}`, error.message, error.stack);
  } else {
    console.error(`${prefix}`, error);
  }
}
