use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{DatabaseBackend, Statement};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create schema
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "CREATE SCHEMA IF NOT EXISTS dial".to_owned(),
            ))
            .await?;

        // Create channels table
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                r#"
                CREATE TABLE IF NOT EXISTS dial.channels (
                    id UUID PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    name TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                "#,
            ))
            .await?;

        // Create messages table
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                r#"
                CREATE TABLE IF NOT EXISTS dial.messages (
                    id UUID PRIMARY KEY,
                    channel_id UUID NOT NULL REFERENCES dial.channels(id) ON DELETE CASCADE,
                    tenant_id UUID NOT NULL,
                    sender_id UUID NOT NULL,
                    content TEXT NOT NULL,
                    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                "#,
            ))
            .await?;

        // Enable RLS
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "ALTER TABLE dial.channels ENABLE ROW LEVEL SECURITY",
            ))
            .await?;
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "ALTER TABLE dial.messages ENABLE ROW LEVEL SECURITY",
            ))
            .await?;

        // Create policies (IF NOT EXISTS)
        let policies = [("dial.channels", "channels"), ("dial.messages", "messages")];
        for (table, name) in policies {
            for op in ["SELECT", "INSERT", "UPDATE", "DELETE"] {
                let policy_name = format!("{}_{}_policy", name, op.to_lowercase());
                let sql = if op == "INSERT" {
                    format!(
                        r#"CREATE POLICY IF NOT EXISTS {policy_name} ON {table} FOR {op}
                           WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)"#
                    )
                } else if op == "UPDATE" {
                    format!(
                        r#"CREATE POLICY IF NOT EXISTS {policy_name} ON {table} FOR {op}
                           USING (tenant_id = current_setting('app.tenant_id')::uuid)
                           WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)"#
                    )
                } else {
                    format!(
                        r#"CREATE POLICY IF NOT EXISTS {policy_name} ON {table} FOR {op}
                           USING (tenant_id = current_setting('app.tenant_id')::uuid)"#
                    )
                };
                manager
                    .execute(Statement::from_string(DatabaseBackend::Postgres, sql))
                    .await?;
            }
        }

        // Create indexes
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "CREATE INDEX IF NOT EXISTS idx_channels_tenant ON dial.channels (tenant_id)",
            ))
            .await?;
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "CREATE INDEX IF NOT EXISTS idx_messages_tenant_channel ON dial.messages (tenant_id, channel_id)",
            ))
            .await?;
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON dial.messages (sent_at)",
            ))
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "DROP TABLE IF EXISTS dial.messages",
            ))
            .await?;
        manager
            .execute(Statement::from_string(
                DatabaseBackend::Postgres,
                "DROP TABLE IF EXISTS dial.channels",
            ))
            .await?;
        // Optionally drop schema? We'll keep it.
        Ok(())
    }
}
