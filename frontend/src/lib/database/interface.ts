/**
 * Database Abstraction Layer - Interface
 *
 * This interface defines all database operations.
 * Any database (Supabase, PostgreSQL, MongoDB, etc.) must implement this interface.
 *
 * Benefits:
 * - Swap databases by just changing the adapter
 * - Test with Supabase, deploy with your own backend
 * - Business logic never knows which database is used
 */

import type {
  QueryOptions,
  InsertOptions,
  UpdateOptions,
  DatabaseResult,
  DatabaseListResult,
  RealtimeCallback,
  RealtimeSubscription,
} from './types';

export interface IDatabase {
  /**
   * Database adapter name (for debugging)
   */
  readonly name: string;

  /**
   * Check if database is connected and ready
   */
  isConnected(): Promise<boolean>;

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Fetch multiple records from a table
   *
   * @example
   * const result = await db.query('assets', {
   *   filters: [{ field: 'enterprise_id', operator: 'eq', value: 'ent-123' }],
   *   orderBy: [{ field: 'created_at', ascending: false }],
   *   limit: 10
   * });
   */
  query<T = any>(
    table: string,
    options?: QueryOptions
  ): Promise<DatabaseListResult<T>>;

  /**
   * Fetch a single record by ID
   *
   * @example
   * const result = await db.queryById('assets', 'ast-123');
   */
  queryById<T = any>(
    table: string,
    id: string
  ): Promise<DatabaseResult<T>>;

  /**
   * Fetch a single record matching filters
   *
   * @example
   * const result = await db.queryOne('assets', {
   *   filters: [{ field: 'serial_number', operator: 'eq', value: 'SN12345' }]
   * });
   */
  queryOne<T = any>(
    table: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<T>>;

  // ==========================================================================
  // MUTATION OPERATIONS
  // ==========================================================================

  /**
   * Insert a new record
   *
   * @example
   * const result = await db.insert('assets', {
   *   id: 'ast-123',
   *   serial_number: 'SN12345',
   *   brand: 'Dell'
   * });
   */
  insert<T = any>(
    table: string,
    data: Partial<T>,
    options?: InsertOptions
  ): Promise<DatabaseResult<T>>;

  /**
   * Insert multiple records
   *
   * @example
   * const result = await db.insertMany('assets', [
   *   { id: 'ast-1', serial_number: 'SN1' },
   *   { id: 'ast-2', serial_number: 'SN2' }
   * ]);
   */
  insertMany<T = any>(
    table: string,
    data: Partial<T>[],
    options?: InsertOptions
  ): Promise<DatabaseListResult<T>>;

  /**
   * Update a record by ID
   *
   * @example
   * const result = await db.update('assets', 'ast-123', {
   *   status: 'assigned'
   * });
   */
  update<T = any>(
    table: string,
    id: string,
    data: Partial<T>,
    options?: UpdateOptions
  ): Promise<DatabaseResult<T>>;

  /**
   * Update multiple records matching filters
   *
   * @example
   * const result = await db.updateMany('assets',
   *   { status: 'completed' },
   *   { filters: [{ field: 'batch_id', operator: 'eq', value: 'bat-123' }] }
   * );
   */
  updateMany<T = any>(
    table: string,
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<DatabaseListResult<T>>;

  /**
   * Delete a record by ID
   *
   * @example
   * await db.delete('assets', 'ast-123');
   */
  delete(
    table: string,
    id: string
  ): Promise<DatabaseResult<void>>;

  /**
   * Delete multiple records matching filters
   *
   * @example
   * await db.deleteMany('assets', {
   *   filters: [{ field: 'status', operator: 'eq', value: 'draft' }]
   * });
   */
  deleteMany(
    table: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<void>>;

  // ==========================================================================
  // REALTIME OPERATIONS
  // ==========================================================================

  /**
   * Subscribe to real-time changes on a table
   *
   * @example
   * const subscription = await db.subscribe(
   *   'assets',
   *   { filters: [{ field: 'enterprise_id', operator: 'eq', value: 'ent-123' }] },
   *   (payload) => {
   *     if (payload.eventType === 'INSERT') {
   *       console.log('New asset:', payload.new);
   *     }
   *   }
   * );
   *
   * // Later: subscription.unsubscribe();
   */
  subscribe<T = any>(
    table: string,
    options: QueryOptions | undefined,
    callback: RealtimeCallback<T>
  ): Promise<RealtimeSubscription | null>;

  // ==========================================================================
  // TRANSACTION OPERATIONS (Optional - may not be supported by all adapters)
  // ==========================================================================

  /**
   * Execute multiple operations in a transaction
   * Returns null if transactions are not supported
   *
   * @example
   * await db.transaction(async (tx) => {
   *   await tx.insert('assets', {...});
   *   await tx.update('batches', 'bat-123', {...});
   * });
   */
  transaction?(
    callback: (tx: IDatabase) => Promise<void>
  ): Promise<void>;
}

/**
 * Database adapter configuration
 */
export interface DatabaseConfig {
  provider: 'supabase' | 'postgresql' | 'mongodb' | 'mysql' | 'localStorage';
  connectionString?: string;
  options?: Record<string, any>;
}
