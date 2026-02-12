# Backend Engineer Memory

## Asset Service Patterns
- `create_asset()` and `create_assets_bulk()` validate enterprise_id and branch_id before serial number check
- Serial number uniqueness is enterprise-scoped (migration 030), not global
- `get_by_serial_number()` takes optional `enterprise_id` param for scoped lookups
- Branch transfer validation in `update_asset()`: check branch exists, same enterprise, no active batch
- Active batch = any status except draft, cancelled, completed
- AuditService.log() used for branch_transfer action; AuditService.log_status_change() for status changes

## Migration Conventions
- Revision IDs: `030_serial_enterprise` (short descriptive slug)
- down_revision chains: 029_add_pwd_reset_cols -> 030_serial_enterprise
- Always create non-unique index when dropping unique index on lookup columns

## Model Conventions
- Asset model uses `__table_args__` tuple for composite unique constraints
- Import `UniqueConstraint` from sqlalchemy when needed
- `branch_id` kept nullable=True in DB for backward compat, validated in service layer

## Schema Conventions
- AssetUpdate now includes `branch_id: Optional[str] = None` for branch transfers
- AssetCreate and AssetBulkCreate have branch_id as Optional but service enforces it

## Dual Codebase Requirement
- ALWAYS copy changed files to `D:\Cursor codes\ecotribe-v2\ecotribe-unified\` after editing
- Use: `cp "D:/Cursor codes/ecotribe-unified/path" "D:/Cursor codes/ecotribe-v2/ecotribe-unified/path"`
