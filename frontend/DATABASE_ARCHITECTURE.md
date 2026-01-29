# Database Architecture - Plug & Play Design

## Overview

EcoTribe now uses a **database-agnostic architecture** with a clean abstraction layer. This means:

✅ **Test with Supabase** → Quick prototyping, zero backend setup
✅ **Deploy with PostgreSQL** → Your own server, full control
✅ **Switch databases easily** → Change one environment variable, zero code changes
✅ **Offline mode** → Works with localStorage (no backend needed)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  (Stores: assetStore, batchStore, submissionStore, etc.)        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Uses generic db interface
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  Database Abstraction Layer                      │
│                        (IDatabase)                               │
│  Generic operations: query(), insert(), update(), delete(),     │
│  subscribe(), etc.                                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼─────┐ ┌─────▼──────┐ ┌───▼──────────┐
│  Supabase   │ │ PostgreSQL │ │ LocalStorage │
│   Adapter   │ │   Adapter  │ │   Adapter    │
│  (Testing)  │ │ (Your Own) │ │  (Fallback)  │
└─────────────┘ └────────────┘ └──────────────┘
```

## File Structure

```
src/lib/database/
├── index.ts                    # Main export (import from here!)
├── interface.ts                # IDatabase interface definition
├── types.ts                    # Generic database types
├── provider.ts                 # Auto-selects adapter based on config
└── adapters/
    ├── supabase.ts            # ✅ Supabase implementation (ready)
    ├── localStorage.ts        # ✅ LocalStorage fallback (ready)
    ├── postgresql.ts          # ⏳ TODO (for your own backend)
    ├── mongodb.ts             # ⏳ TODO (if you prefer NoSQL)
    └── mysql.ts               # ⏳ TODO (alternative SQL)
```

## Usage Example

### In Your Stores/Services

```typescript
import { db } from '@/lib/database';

// Query assets (works with ANY database!)
const result = await db.query('assets', {
  filters: [
    { field: 'enterprise_id', operator: 'eq', value: 'ent-123' },
    { field: 'status', operator: 'in', value: ['assigned', 'submitted'] }
  ],
  orderBy: [{ field: 'created_at', ascending: false }],
  limit: 20
});

if (result.error) {
  console.error('Query failed:', result.error.message);
} else {
  console.log('Found assets:', result.data);
}

// Insert asset
const newAsset = await db.insert('assets', {
  id: 'ast-123',
  serial_number: 'SN12345',
  brand: 'Dell',
  model: 'Latitude 5420',
  status: 'pending_assignment',
  enterprise_id: 'ent-123'
});

// Update asset
const updated = await db.update('assets', 'ast-123', {
  status: 'assigned',
  assigned_sub_user_id: 'sub-456'
});

// Subscribe to real-time changes (if supported)
const subscription = await db.subscribe(
  'assets',
  { filters: [{ field: 'enterprise_id', operator: 'eq', value: 'ent-123' }] },
  (payload) => {
    if (payload.eventType === 'INSERT') {
      console.log('New asset created:', payload.new);
    }
    if (payload.eventType === 'UPDATE') {
      console.log('Asset updated:', payload.new);
    }
  }
);

// Later: cleanup
subscription?.unsubscribe();
```

## Switching Databases

### Option 1: Test with Supabase (Quick Start)

Perfect for testing multi-user functionality without setting up a backend.

**Step 1:** Update `.env`:
```env
VITE_DATABASE_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 2:** Run migration SQL in Supabase dashboard

**Step 3:** Start dev server
```bash
npm run dev
```

**That's it!** The app now uses Supabase. All stores automatically use real-time sync.

### Option 2: Use Your Own PostgreSQL

After testing with Supabase, switch to your own backend:

**Step 1:** Set up your PostgreSQL server with the schema from `supabase/migrations/001_initial_schema.sql`

**Step 2:** Create PostgreSQL adapter (TODO - see template below)

**Step 3:** Update `.env`:
```env
VITE_DATABASE_PROVIDER=postgresql
VITE_POSTGRES_URL=postgresql://user:password@db.yourcompany.com:5432/ecotribe
```

**Step 4:** Restart dev server
```bash
npm run dev
```

**Done!** Zero code changes needed. The app now uses your PostgreSQL database.

### Option 3: Offline Development (No Backend)

For offline development or single-user testing:

**Just set:**
```env
VITE_DATABASE_PROVIDER=localStorage
```

Everything works offline using browser localStorage!

## Creating a New Adapter

Want to use MongoDB, MySQL, or a custom backend? Create an adapter!

### Template: PostgreSQL Adapter

```typescript
// src/lib/database/adapters/postgresql.ts
import { Pool } from 'pg';
import type { IDatabase } from '../interface';
import type { QueryOptions, DatabaseResult, DatabaseListResult } from '../types';

export class PostgreSQLAdapter implements IDatabase {
  readonly name = 'PostgreSQL';
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async query<T>(table: string, options?: QueryOptions): Promise<DatabaseListResult<T>> {
    // Build SQL query from options
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // Add WHERE clause from filters
    if (options?.filters && options.filters.length > 0) {
      const conditions = options.filters.map((f, i) => {
        params.push(f.value);
        return `${f.field} ${this.operatorToSql(f.operator)} $${params.length}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options?.orderBy) {
      const orders = options.orderBy.map(o =>
        `${o.field} ${o.ascending ? 'ASC' : 'DESC'}`
      );
      sql += ` ORDER BY ${orders.join(', ')}`;
    }

    // Add LIMIT/OFFSET
    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    try {
      const result = await this.pool.query(sql, params);
      return {
        data: result.rows as T[],
        error: null,
        count: result.rowCount || 0,
      };
    } catch (err: any) {
      return {
        data: [],
        error: new DatabaseError(err.message),
      };
    }
  }

  private operatorToSql(op: string): string {
    const map: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      in: 'IN',
      like: 'LIKE',
      ilike: 'ILIKE',
    };
    return map[op] || '=';
  }

  // Implement other IDatabase methods...
  async insert<T>(...) { /* ... */ }
  async update<T>(...) { /* ... */ }
  async delete(...) { /* ... */ }
  async subscribe(...) { /* Use pg-listen or similar */ }
}
```

### Register Your Adapter

```typescript
// src/lib/database/provider.ts
import { PostgreSQLAdapter } from './adapters/postgresql';

// In DatabaseProvider.initialize():
case 'postgresql':
  this.adapter = new PostgreSQLAdapter(config.connectionString!);
  console.log('[Database] ✅ Using PostgreSQL adapter');
  break;
```

**That's it!** Your custom database is now supported.

## Benefits of This Architecture

### 1. **Test Fast, Deploy Smart**
```
Week 1: Test with Supabase (zero setup)
Week 2: Team testing with Supabase
Week 3: Switch to your own PostgreSQL (one env var change)
```

### 2. **Zero Vendor Lock-In**
- Not happy with Supabase? Switch to PostgreSQL
- Want MongoDB instead? Create adapter, switch
- No code changes needed in business logic

### 3. **Consistent API**
```typescript
// Same code works with ANY database:
const assets = await db.query('assets', {...});
```

### 4. **Easy Testing**
```typescript
// In tests, use in-memory adapter
const mockDb = new InMemoryAdapter();
// Run tests without real database
```

### 5. **Gradual Migration**
```typescript
// During migration, run both databases side-by-side
await supabaseDb.insert(...);
await postgresDb.insert(...);
// Verify data matches, then switch fully
```

## Database Feature Matrix

| Feature | Supabase | PostgreSQL | LocalStorage | MongoDB |
|---------|----------|------------|--------------|---------|
| **Real-time sync** | ✅ Yes | ⏳ TODO (pg-listen) | ❌ No | ⏳ TODO (Change Streams) |
| **Multi-user** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Transactions** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Setup time** | 2 min | 30 min | 0 min | 30 min |
| **Cost** | Free tier | Your server | Free | Your server |
| **Best for** | Testing | Production | Offline dev | NoSQL fans |

## Migration Path

### Phase 1: Testing (Current)
```
VITE_DATABASE_PROVIDER=supabase
```
- Quick setup
- Multi-user testing
- Free tier

### Phase 2: Production
```
VITE_DATABASE_PROVIDER=postgresql
VITE_POSTGRES_URL=postgresql://...
```
- Your own backend
- Full control
- Production-ready

### Phase 3: Scale
- Add Redis for caching
- Add read replicas
- Add CDN for assets
- Keep database layer unchanged!

## API Reference

### Query Operations

```typescript
// Fetch all
await db.query('assets');

// Fetch with filters
await db.query('assets', {
  filters: [
    { field: 'status', operator: 'eq', value: 'assigned' },
    { field: 'created_at', operator: 'gte', value: '2024-01-01' }
  ]
});

// Fetch one by ID
await db.queryById('assets', 'ast-123');

// Fetch one by condition
await db.queryOne('assets', {
  filters: [{ field: 'serial_number', operator: 'eq', value: 'SN12345' }]
});
```

### Mutation Operations

```typescript
// Insert
await db.insert('assets', { ... });

// Insert multiple
await db.insertMany('assets', [{ ... }, { ... }]);

// Update one
await db.update('assets', 'ast-123', { status: 'assigned' });

// Update many
await db.updateMany('assets', { status: 'completed' }, {
  filters: [{ field: 'batch_id', operator: 'eq', value: 'bat-123' }]
});

// Delete
await db.delete('assets', 'ast-123');

// Delete many
await db.deleteMany('assets', {
  filters: [{ field: 'status', operator: 'eq', value: 'draft' }]
});
```

### Real-time Operations

```typescript
// Subscribe to all changes
const sub = await db.subscribe('assets', undefined, (payload) => {
  console.log(payload.eventType, payload.new);
});

// Subscribe with filter
const sub = await db.subscribe('assets',
  { filters: [{ field: 'enterprise_id', operator: 'eq', value: 'ent-123' }] },
  (payload) => { ... }
);

// Unsubscribe
sub?.unsubscribe();
```

## FAQ

**Q: Do I need Supabase for production?**
A: No! Supabase is just for quick testing. Use PostgreSQL/MongoDB/MySQL for production.

**Q: Can I switch databases after launching?**
A: Yes! Just create an adapter for the new database, update `.env`, and restart.

**Q: What if I want to use REST API instead of direct database?**
A: Create a `RestApiAdapter` that calls your API instead of database.

**Q: Does this work with Prisma/TypeORM?**
A: Yes! Create an adapter that uses Prisma/TypeORM internally.

**Q: Can I use multiple databases?**
A: Yes! Import specific adapters and use them side-by-side for migration.

---

**Bottom line:** Test with Supabase, deploy with whatever you want. Zero vendor lock-in. 🚀
