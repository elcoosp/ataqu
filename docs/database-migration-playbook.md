# 🗄️ ATAQU DATABASE MIGRATION PLAYBOOK — Zero-Downtime Deployments

**Version:** 1.0
**Date:** 2026-08-08
**Target:** Developers and on‑call engineers

> This document provides the standard operating procedure for writing, testing, and deploying SeaORM migrations to production without downtime. It covers forward migrations, rollbacks, and the strategy for handling breaking changes.

---

## 1. Writing a Migration

Migrations are located in `crates/ataqu-infra-migration/src/`. Each file follows the naming convention `mYYYYMMDD_HHMMSS_description.rs`.

### 1.1 Create a New Migration

```bash
cargo run --bin migrator generate <description>
```

This creates a new file with the `up` and `down` methods.

### 1.2 Implement `up` and `down`

Use `manager.get_connection().execute_unprepared()` for raw SQL, or the SeaORM schema API.

**Example (`create_shopify_integrations.rs`):**
```rust
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE vault.shopify_integrations (
                id BIGSERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                shop_url TEXT NOT NULL UNIQUE,
                access_token TEXT NOT NULL,
                scope TEXT NOT NULL,
                last_synced_at TIMESTAMPTZ,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"DROP TABLE vault.shopify_integrations;"#
        ).await?;
        Ok(())
    }
}
```

**Rules:**
- Always provide a `down` method to allow rollback.
- Use `IF NOT EXISTS` and `IF EXISTS` where appropriate to make migrations idempotent.

---

## 2. Testing Migrations

### 2.1 Run Locally

```bash
# Run all pending migrations
cargo run --bin migrator

# Rollback the last migration
cargo run --bin migrator down
```

### 2.2 Test with Testcontainers

Integration tests automatically run migrations on a fresh PostgreSQL container. This validates that the migration works on a clean DB.

**CI integration:** The CI pipeline runs `cargo test --workspace`, which includes migration tests via Testcontainers.

---

## 3. Deployment Strategy (Zero Downtime)

### 3.1 Principles

- **Never** run a migration that locks the table for more than 2 seconds.
- **Always** keep backward compatibility for at least one release cycle.
- **Use the outbox pattern** for schema changes that require data transformation.

### 3.2 Types of Changes

| Change Type | Safe for Zero Downtime? | Strategy |
|-------------|-------------------------|----------|
| Add a new column with `DEFAULT NULL` | ✅ Yes | Safe. Add column, then backfill data in a later release. |
| Add a new table | ✅ Yes | Safe. Existing code ignores it. |
| Drop a column | ❌ No | Deprecate the column first (stop writing to it), wait a release, then drop. |
| Rename a column | ❌ No | Add a new column with the new name, copy data, then drop the old column in a later release. |
| Add a NOT NULL constraint | ❌ No | Backfill the column with a default value first, then add the constraint. |
| Create an index | ✅ Yes (but with `CONCURRENTLY`) | Use `CREATE INDEX CONCURRENTLY` to avoid locking. |
| Drop an index | ✅ Yes | Use `DROP INDEX CONCURRENTLY`. |

### 3.3 The "Rolling Migration" Pattern (for breaking changes)

1. **Release N:** Add the new column with `DEFAULT NULL`. Deploy code that writes to *both* the old and new columns.
2. **Release N+1:** Backfill the new column with a background job (via outbox). Deploy code that reads from the new column but falls back to the old.
3. **Release N+2:** Drop the old column. Deploy code that only uses the new column.

**Example: Renaming `user_name` to `full_name`**

- **Migration 1:** `ALTER TABLE users ADD COLUMN full_name TEXT;`
- **Migration 2 (background):** `UPDATE users SET full_name = user_name;` (run via outbox job)
- **Migration 3:** `ALTER TABLE users DROP COLUMN user_name;`

---

## 4. Rollback Procedure

If a migration causes issues, immediately roll it back.

### 4.1 Rollback the Last Migration

```bash
cargo run --bin migrator down
```

### 4.2 Rollback to a Specific Migration

```bash
cargo run --bin migrator down -n <number>
```

### 4.3 Verify Rollback

Check that the schema is restored and the application works. Run the health checks: `curl /health/ready`.

---

## 5. Monitoring During Migrations

- **Connection pool:** Monitor `ataqu_db_active_connections` – if it spikes to 40, the migration is locking the DB.
- **Outbox lag:** If the migration holds locks, outbox events may queue up.
- **Error rate:** Watch for 500s during the migration window.

**Alert:** If `ataqu_db_active_connections` exceeds 35 for more than 1 minute, abort the migration and rollback.

---

## 6. Checklist for a Safe Migration

- [ ] Written `up` and `down` methods.
- [ ] Tested locally against a fresh DB.
- [ ] Checked that `down` works without errors.
- [ ] Verified that the migration does not lock the table for > 2s (use `EXPLAIN ANALYZE` if needed).
- [ ] Planned for backward compatibility (if needed).
- [ ] Notified the team of the scheduled migration time.
- [ ] Prepared a rollback plan.

---

## 7. Emergency Migration

If a migration fails in production and cannot be rolled back automatically:

1. **Stop the application:** `systemctl stop ataqu-server`.
2. **Manually revert the schema:** Run the `down` SQL directly on the DB.
3. **Restart the application:** `systemctl start ataqu-server`.
4. **Schedule a post‑mortem.**

---

**This playbook is a living document. Update it when new migration patterns emerge.**
