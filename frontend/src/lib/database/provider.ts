/**
 * Database Provider - Automatic Adapter Selection
 *
 * This factory automatically selects the right database adapter based on configuration.
 *
 * Supported Databases:
 * - Supabase (for testing/prototyping)
 * - LocalStorage (fallback, no backend needed)
 * - PostgreSQL (TODO: for your own backend)
 * - MongoDB (TODO: if you prefer NoSQL)
 * - MySQL (TODO: alternative SQL)
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/database';
 *
 * // The app automatically uses the right database!
 * const assets = await db.query('assets', {
 *   filters: [{ field: 'status', operator: 'eq', value: 'assigned' }]
 * });
 * ```
 */

import type { IDatabase, DatabaseConfig } from './interface';
import { SupabaseAdapter } from './adapters/supabase';
import { LocalStorageAdapter } from './adapters/localStorage';

class DatabaseProvider {
  private adapter: IDatabase | null = null;
  private config: DatabaseConfig | null = null;

  /**
   * Initialize the database with given configuration
   */
  initialize(config: DatabaseConfig): void {
    this.config = config;

    switch (config.provider) {
      case 'supabase':
        if (!config.connectionString || !config.options?.anonKey) {
          console.warn('[Database] Supabase credentials missing, falling back to localStorage');
          this.adapter = new LocalStorageAdapter();
        } else {
          this.adapter = new SupabaseAdapter(config.connectionString, config.options.anonKey);
          console.log('[Database] ✅ Using Supabase adapter');
        }
        break;

      case 'postgresql':
        // TODO: Implement PostgresAdapter
        console.error('[Database] PostgreSQL adapter not implemented yet, falling back to localStorage');
        this.adapter = new LocalStorageAdapter();
        break;

      case 'mongodb':
        // TODO: Implement MongoDBAdapter
        console.error('[Database] MongoDB adapter not implemented yet, falling back to localStorage');
        this.adapter = new LocalStorageAdapter();
        break;

      case 'mysql':
        // TODO: Implement MySQLAdapter
        console.error('[Database] MySQL adapter not implemented yet, falling back to localStorage');
        this.adapter = new LocalStorageAdapter();
        break;

      case 'localStorage':
      default:
        this.adapter = new LocalStorageAdapter();
        console.log('[Database] ℹ️ Using LocalStorage adapter (fallback mode)');
        break;
    }
  }

  /**
   * Auto-initialize from environment variables
   */
  autoInitialize(): void {
    console.log('🔧 [Database Provider] Starting auto-initialization...');

    const provider = import.meta.env.VITE_DATABASE_PROVIDER || 'localStorage';
    console.log(`🔧 [Database Provider] Environment says: "${provider}"`);

    // Supabase configuration
    if (provider === 'supabase') {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('🔧 [Database Provider] Checking Supabase credentials...');
      console.log('   URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
      console.log('   Key:', supabaseKey ? '✅ Found' : '❌ Missing');

      if (supabaseUrl && supabaseKey) {
        this.initialize({
          provider: 'supabase',
          connectionString: supabaseUrl,
          options: { anonKey: supabaseKey },
        });
        return;
      } else {
        console.warn('⚠️ [Database Provider] Supabase credentials missing, falling back to localStorage');
      }
    }

    // PostgreSQL configuration
    if (provider === 'postgresql') {
      const pgConnectionString = import.meta.env.VITE_POSTGRES_URL;

      if (pgConnectionString) {
        this.initialize({
          provider: 'postgresql',
          connectionString: pgConnectionString,
        });
        return;
      }
    }

    // MongoDB configuration
    if (provider === 'mongodb') {
      const mongoConnectionString = import.meta.env.VITE_MONGODB_URL;

      if (mongoConnectionString) {
        this.initialize({
          provider: 'mongodb',
          connectionString: mongoConnectionString,
        });
        return;
      }
    }

    // Fallback to localStorage
    console.log('[Database] No database configured, using localStorage');
    this.initialize({ provider: 'localStorage' });
  }

  /**
   * Get the current database adapter
   */
  getAdapter(): IDatabase {
    if (!this.adapter) {
      // Auto-initialize if not already done
      this.autoInitialize();
    }
    return this.adapter!;
  }

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * Check which database is currently active
   */
  isUsing(provider: DatabaseConfig['provider']): boolean {
    return this.config?.provider === provider;
  }
}

// Singleton instance
const provider = new DatabaseProvider();

// Auto-initialize on import
provider.autoInitialize();

// Export the database instance (delegates to current adapter)
export const db: IDatabase = new Proxy({} as IDatabase, {
  get(_target, prop) {
    const adapter = provider.getAdapter();
    const value = (adapter as any)[prop];

    if (typeof value === 'function') {
      return value.bind(adapter);
    }

    return value;
  },
});

// Export provider for advanced use cases
export { provider as databaseProvider };

// Export types
export type { IDatabase, DatabaseConfig };
