/**
 * Database stub
 *
 * Legacy stores still import `db` from here. This stub provides no-op methods
 * so the stores can load without errors. All real data fetching uses REST API
 * hooks from @/hooks instead.
 */

const noop = async () => ({ data: null, error: null });

export const db = {
  query: async (_table: string, _options?: unknown) => ({ data: [], error: null }),
  insert: async (_table: string, _data: unknown) => noop(),
  update: async (_table: string, _id: string, _data: unknown) => noop(),
  delete: async (_table: string, _id: string) => noop(),
  getById: async (_table: string, _id: string) => noop(),
};

export const databaseProvider = {
  getStatus: () => ({ isConnected: false, provider: 'none' as const }),
};
