/**
 * LocalStorage Database Adapter
 *
 * Implements IDatabase interface using browser localStorage.
 * Used as fallback when no database is configured.
 * Good for offline development and testing without backend.
 */

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

export class LocalStorageAdapter implements IDatabase {
  readonly name = 'LocalStorage';
  private prefix = 'ecotribe_';

  async isConnected(): Promise<boolean> {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private getKey(table: string): string {
    return `${this.prefix}${table}`;
  }

  private getData<T>(table: string): T[] {
    try {
      const data = localStorage.getItem(this.getKey(table));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setData<T>(table: string, data: T[]): void {
    try {
      localStorage.setItem(this.getKey(table), JSON.stringify(data));
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save:', err);
    }
  }

  private matchesFilters<T>(record: T, filters?: QueryOptions['filters']): boolean {
    if (!filters || filters.length === 0) return true;

    return filters.every(filter => {
      const value = (record as any)[filter.field];

      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'neq':
          return value !== filter.value;
        case 'gt':
          return value > filter.value;
        case 'gte':
          return value >= filter.value;
        case 'lt':
          return value < filter.value;
        case 'lte':
          return value <= filter.value;
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        case 'like':
        case 'ilike':
          const pattern = filter.value.replace(/%/g, '.*');
          const regex = new RegExp(pattern, filter.operator === 'ilike' ? 'i' : '');
          return regex.test(String(value));
        default:
          return false;
      }
    });
  }

  private applyOptions<T>(records: T[], options?: QueryOptions): T[] {
    let result = [...records];

    // Apply ordering
    if (options?.orderBy && options.orderBy.length > 0) {
      result.sort((a, b) => {
        for (const order of options.orderBy!) {
          const aVal = (a as any)[order.field];
          const bVal = (b as any)[order.field];
          const ascending = order.ascending ?? true;

          if (aVal < bVal) return ascending ? -1 : 1;
          if (aVal > bVal) return ascending ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const start = options.offset || 0;
      const end = start + (options.limit || result.length);
      result = result.slice(start, end);
    }

    return result;
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  async query<T>(table: string, options?: QueryOptions): Promise<DatabaseListResult<T>> {
    try {
      const allData = this.getData<T>(table);
      const filtered = allData.filter(record => this.matchesFilters(record, options?.filters));
      const result = this.applyOptions(filtered, options);

      return {
        data: result,
        error: null,
        count: filtered.length,
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
      const allData = this.getData<T>(table);
      const record = allData.find((r: any) => r.id === id);

      if (!record) {
        return {
          data: null,
          error: new DatabaseError('Record not found', 'NOT_FOUND'),
        };
      }

      return {
        data: record,
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
      const allData = this.getData<T>(table);
      const record = allData.find(r => this.matchesFilters(r, options?.filters));

      if (!record) {
        return {
          data: null,
          error: new DatabaseError('Record not found', 'NOT_FOUND'),
        };
      }

      return {
        data: record,
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
      const allData = this.getData<T>(table);
      const newRecord = {
        ...data,
        created_at: data.hasOwnProperty('created_at') ? (data as any).created_at : new Date().toISOString(),
      } as T;

      allData.push(newRecord);
      this.setData(table, allData);

      return {
        data: options?.returning !== false ? newRecord : null,
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
      const allData = this.getData<T>(table);
      const newRecords = data.map(d => ({
        ...d,
        created_at: d.hasOwnProperty('created_at') ? (d as any).created_at : new Date().toISOString(),
      })) as T[];

      allData.push(...newRecords);
      this.setData(table, allData);

      return {
        data: options?.returning !== false ? newRecords : [],
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
      const allData = this.getData<T>(table);
      const index = allData.findIndex((r: any) => r.id === id);

      if (index === -1) {
        return {
          data: null,
          error: new DatabaseError('Record not found', 'NOT_FOUND'),
        };
      }

      const updated = {
        ...allData[index],
        ...data,
        updated_at: new Date().toISOString(),
      };

      allData[index] = updated;
      this.setData(table, allData);

      return {
        data: options?.returning !== false ? updated : null,
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
      const allData = this.getData<T>(table);
      const updatedRecords: T[] = [];

      for (let i = 0; i < allData.length; i++) {
        if (this.matchesFilters(allData[i], options?.filters)) {
          const updated = {
            ...allData[i],
            ...data,
            updated_at: new Date().toISOString(),
          };
          allData[i] = updated;
          updatedRecords.push(updated);
        }
      }

      this.setData(table, allData);

      return {
        data: updatedRecords,
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
      const allData = this.getData(table);
      const filtered = allData.filter((r: any) => r.id !== id);

      if (filtered.length === allData.length) {
        return {
          data: null,
          error: new DatabaseError('Record not found', 'NOT_FOUND'),
        };
      }

      this.setData(table, filtered);

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
      const allData = this.getData(table);
      const filtered = allData.filter(r => !this.matchesFilters(r, options?.filters));

      this.setData(table, filtered);

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
    // LocalStorage doesn't support real-time updates across tabs
    // Could be implemented with storage events, but that's complex
    console.warn('[LocalStorageAdapter] Real-time subscriptions are not supported');
    return null;
  }
}
