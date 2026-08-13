use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add a unique constraint if it doesn't exist
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'permissions_tenant_user_app_unique'
                    AND conrelid = 'core.permissions'::regclass
                ) THEN
                    ALTER TABLE core.permissions
                    ADD CONSTRAINT permissions_tenant_user_app_unique
                    UNIQUE (tenant_id, user_id, app);
                END IF;
            END $$;
            "#,
        )
        .await?;

        // Insert default permissions for all users, skipping duplicates
        db.execute_unprepared(
            r#"
            INSERT INTO core.permissions (tenant_id, user_id, app, role, created_at, updated_at)
            SELECT u.tenant_id, u.id, app, 'viewer', NOW(), NOW()
            FROM core.users u
            CROSS JOIN (VALUES ('aegis'), ('cinq'), ('dial'), ('vault'), ('pause'), ('pivot'), ('sond'), ('spark'), ('tempo'), ('vista')) AS apps(app)
            ON CONFLICT (tenant_id, user_id, app) DO NOTHING;
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        // Optionally remove the default permissions (but it's idempotent)
        db.execute_unprepared(
            "DELETE FROM core.permissions WHERE role = 'viewer' AND app IN ('aegis','cinq','dial','vault','pause','pivot','sond','spark','tempo','vista');"
        ).await?;
        // Drop the unique constraint if we added it
        db.execute_unprepared(
            "ALTER TABLE core.permissions DROP CONSTRAINT IF EXISTS permissions_tenant_user_app_unique;"
        ).await?;
        Ok(())
    }
}
