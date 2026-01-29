/**
 * Database Abstraction Layer - Types
 *
 * Generic types for database operations that work with any backend:
 * - Supabase (for testing)
 * - PostgreSQL (your own server)
 * - MongoDB
 * - MySQL
 * - Any other database
 */

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'ilike';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
}

export interface InsertOptions {
  returning?: boolean;
}

export interface UpdateOptions {
  returning?: boolean;
}

// ============================================================================
// REALTIME TYPES
// ============================================================================

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  table: string;
  new: T | null;
  old: T | null;
}

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void;

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface DatabaseListResult<T> {
  data: T[];
  error: DatabaseError | null;
  count?: number;
}
