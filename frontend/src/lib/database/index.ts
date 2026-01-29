/**
 * Database Abstraction Layer - Main Export
 *
 * Import the database from here in your stores and services.
 *
 * @example
 * ```typescript
 * import { db } from '@/lib/database';
 *
 * // Query assets
 * const result = await db.query('assets', {
 *   filters: [{ field: 'enterprise_id', operator: 'eq', value: 'ent-123' }]
 * });
 *
 * // Insert asset
 * const newAsset = await db.insert('assets', {
 *   id: 'ast-123',
 *   serial_number: 'SN12345',
 *   // ...
 * });
 *
 * // Subscribe to changes
 * const subscription = await db.subscribe('assets', null, (payload) => {
 *   console.log('Asset changed:', payload);
 * });
 * ```
 */

export { db, databaseProvider } from './provider';
export type { IDatabase, DatabaseConfig } from './interface';
export type {
  QueryOptions,
  QueryFilter,
  InsertOptions,
  UpdateOptions,
  DatabaseResult,
  DatabaseListResult,
  DatabaseError,
  RealtimePayload,
  RealtimeCallback,
  RealtimeSubscription,
  RealtimeEventType,
} from './types';

// Adapter exports (for advanced use cases)
export { SupabaseAdapter } from './adapters/supabase';
export { LocalStorageAdapter } from './adapters/localStorage';
