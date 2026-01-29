/**
 * useApiError Hook
 * Provides easy error handling with toast notifications for API operations
 *
 * Usage:
 * ```tsx
 * const { handleError, handleMutationError } = useApiError();
 *
 * // In a try/catch block
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   handleError(error, 'Creating asset');
 * }
 *
 * // Or with React Query mutation
 * const mutation = useMutation({
 *   mutationFn: createAsset,
 *   onError: (error) => handleMutationError(error, 'Asset Creation'),
 * });
 * ```
 */

import { useCallback } from 'react';
import { useToast } from '@/components/ui';
import {
  getErrorDisplay,
  logError,
  isAuthenticationError,
  type ErrorDisplayConfig,
} from '@/lib/api/index';

interface UseApiErrorOptions {
  /** Whether to automatically show toast on error (default: true) */
  showToast?: boolean;
  /** Whether to log errors to console (default: true) */
  logToConsole?: boolean;
  /** Custom error transformer */
  transformError?: (error: unknown) => ErrorDisplayConfig | null;
}

interface UseApiErrorReturn {
  /** Handle any error with optional context */
  handleError: (error: unknown, context?: string) => void;
  /** Handle mutation errors (same as handleError but semantically clearer) */
  handleMutationError: (error: unknown, operationName?: string) => void;
  /** Show a custom error toast */
  showError: (title: string, message?: string) => void;
  /** Show a success toast */
  showSuccess: (title: string, message?: string) => void;
  /** Show a warning toast */
  showWarning: (title: string, message?: string) => void;
  /** Show an info toast */
  showInfo: (title: string, message?: string) => void;
}

export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorReturn {
  const { showToast = true, logToConsole = true, transformError } = options;
  const { addToast } = useToast();

  const handleError = useCallback(
    (error: unknown, context?: string) => {
      // Log the error if enabled
      if (logToConsole) {
        logError(error, context);
      }

      // Skip toast for authentication errors (handled by auth system)
      if (isAuthenticationError(error)) {
        return;
      }

      if (!showToast) {
        return;
      }

      // Try custom transformer first
      let displayConfig: ErrorDisplayConfig | null = null;
      if (transformError) {
        displayConfig = transformError(error);
      }

      // Fall back to default error display
      if (!displayConfig) {
        displayConfig = getErrorDisplay(error);
      }

      // Add context to the message if provided
      if (context && displayConfig.message) {
        displayConfig.message = `${context}: ${displayConfig.message}`;
      }

      addToast({
        type: displayConfig.type,
        title: displayConfig.title,
        message: displayConfig.message,
        duration: displayConfig.duration,
      });
    },
    [addToast, logToConsole, showToast, transformError]
  );

  const handleMutationError = useCallback(
    (error: unknown, operationName?: string) => {
      handleError(error, operationName ? `Failed: ${operationName}` : undefined);
    },
    [handleError]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  return {
    handleError,
    handleMutationError,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

export default useApiError;
