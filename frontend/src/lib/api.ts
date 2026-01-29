/**
 * API Service Layer
 * Handles all HTTP requests to the FastAPI backend
 *
 * This file re-exports from the modular API structure in ./api/
 * For new code, prefer importing from '@/lib/api/index' or specific modules.
 *
 * @deprecated Import from '@/lib/api/index' instead for new code.
 */

// Re-export everything from the new modular structure
export * from './api/index';
