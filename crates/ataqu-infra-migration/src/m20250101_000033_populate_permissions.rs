use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // For each user, insert default 'viewer' permissions for all apps.
        // We use a cross join with a VALUES list of apps.
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
        db.execute_unprepared(
            "DELETE FROM core.permissions;"
        ).await?;
        Ok(())
    }
}
