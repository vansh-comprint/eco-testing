/**
 * Supabase Database Adapter
 *
 * Implements IDatabase interface using Supabase as the backend.
 * Used for quick testing and prototyping.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IDatabase } from '../interface';
import type {
  QueryOptions,
  InsertOptions,
  UpdateOptions,
  DatabaseResult,
  DatabaseListResult,
  RealtimeCallback,
  RealtimeSubscription,
} from '../types';
import { DatabaseError } from '../types';

export class SupabaseAdapter implements IDatabase {
  readonly name = 'Supabase';
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  async isConnected(): Promise<boolean> {
    try {
      // Simple health check
      const { error } = await this.client.from('enterprises').select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  async query<T>(table: string, options?: QueryOptions): Promise<DatabaseListResult<T>> {
    try {
      let query = this.client.from(table).select('*', { count: 'exact' });

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          switch (filter.operator) {
            case 'eq':
              query = query.eq(filter.field, filter.value);
              break;
            case 'neq':
              query = query.neq(filter.field, filter.value);
              break;
            case 'gt':
              query = query.gt(filter.field, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.field, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.field, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.field, filter.value);
              break;
            case 'in':
              query = query.in(filter.field, filter.value);
              break;
            case 'like':
              query = query.like(filter.field, filter.value);
              break;
            case 'ilike':
              query = query.ilike(filter.field, filter.value);
              break;
          }
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        for (const order of options.orderBy) {
          query = query.order(order.field, { ascending: order.ascending ?? true });
        }
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          data: [],
          error: new DatabaseError(error.message, error.code, error),
          count: 0,
        };
      }

      return {
        data: (data || []) as T[],
        error: null,
        count: count || undefined,
      };
    } catch (err: any) {
      return {
        data: [],
        error: new DatabaseError(err.message || 'Query failed'),
      };
    }
  }

  async queryById<T>(table: string, id: string): Promise<DatabaseResult<T>> {
    try {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          data: null,
          error: new DatabaseError(error.message, error.code, error),
        };
      }

      return {
        data: data as T,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Query by ID failed'),
      };
    }
  }

  async queryOne<T>(table: string, options?: QueryOptions): Promise<DatabaseResult<T>> {
    try {
      let query = this.client.from(table).select('*');

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          query = query.eq(filter.field, filter.value);
        }
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        return {
          data: null,
          error: new DatabaseError(error.message, error.code, error),
        };
      }

      return {
        data: data as T,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Query one failed'),
      };
    }
  }

  // ==========================================================================
  // MUTATION OPERATIONS
  // ==========================================================================

  async insert<T>(table: string, data: Partial<T>, options?: InsertOptions): Promise<DatabaseResult<T>> {
    try {
      const query = this.client.from(table).insert(data as any);

      const result = options?.returning !== false
        ? await query.select().single()
        : await query;

      if (result.error) {
        return {
          data: null,
          error: new DatabaseError(result.error.message, result.error.code, result.error),
        };
      }

      return {
        data: result.data as T,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Insert failed'),
      };
    }
  }

  async insertMany<T>(table: string, data: Partial<T>[], options?: InsertOptions): Promise<DatabaseListResult<T>> {
    try {
      const query = this.client.from(table).insert(data as any[]);

      const result = options?.returning !== false
        ? await query.select()
        : await query;

      if (result.error) {
        return {
          data: [],
          error: new DatabaseError(result.error.message, result.error.code, result.error),
        };
      }

      return {
        data: (result.data || []) as T[],
        error: null,
      };
    } catch (err: any) {
      return {
        data: [],
        error: new DatabaseError(err.message || 'Insert many failed'),
      };
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>, options?: UpdateOptions): Promise<DatabaseResult<T>> {
    try {
      const query = this.client.from(table).update(data as any).eq('id', id);

      const result = options?.returning !== false
        ? await query.select().single()
        : await query;

      if (result.error) {
        return {
          data: null,
          error: new DatabaseError(result.error.message, result.error.code, result.error),
        };
      }

      return {
        data: result.data as T,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Update failed'),
      };
    }
  }

  async updateMany<T>(table: string, data: Partial<T>, options?: QueryOptions): Promise<DatabaseListResult<T>> {
    try {
      let query = this.client.from(table).update(data as any);

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          query = query.eq(filter.field, filter.value);
        }
      }

      const { data: resultData, error } = await query.select();

      if (error) {
        return {
          data: [],
          error: new DatabaseError(error.message, error.code, error),
        };
      }

      return {
        data: (resultData || []) as T[],
        error: null,
      };
    } catch (err: any) {
      return {
        data: [],
        error: new DatabaseError(err.message || 'Update many failed'),
      };
    }
  }

  async delete(table: string, id: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await this.client.from(table).delete().eq('id', id);

      if (error) {
        return {
          data: null,
          error: new DatabaseError(error.message, error.code, error),
        };
      }

      return {
        data: null,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Delete failed'),
      };
    }
  }

  async deleteMany(table: string, options?: QueryOptions): Promise<DatabaseResult<void>> {
    try {
      let query = this.client.from(table).delete();

      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          query = query.eq(filter.field, filter.value);
        }
      }

      const { error } = await query;

      if (error) {
        return {
          data: null,
          error: new DatabaseError(error.message, error.code, error),
        };
      }

      return {
        data: null,
        error: null,
      };
    } catch (err: any) {
      return {
        data: null,
        error: new DatabaseError(err.message || 'Delete many failed'),
      };
    }
  }

  // ==========================================================================
  // REALTIME OPERATIONS
  // ==========================================================================

  async subscribe<T>(
    table: string,
    options: QueryOptions | undefined,
    callback: RealtimeCallback<T>
  ): Promise<RealtimeSubscription | null> {
    try {
      const filterString = options?.filters
        ? options.filters.map(f => `${f.field}=${f.operator}.${f.value}`).join(',')
        : undefined;

      const channelName = filterString ? `${table}:${filterString}` : `${table}:all`;

      const channel = this.client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filterString && { filter: filterString }),
          },
          (payload) => {
            callback({
              eventType: payload.eventType as any,
              table,
              new: payload.new as T | null,
              old: payload.old as T | null,
            });
          }
        )
        .subscribe();

      return {
        unsubscribe: () => {
          this.client.removeChannel(channel);
        },
      };
    } catch (err) {
      console.error('[SupabaseAdapter] Subscribe failed:', err);
      return null;
    }
  }
}
