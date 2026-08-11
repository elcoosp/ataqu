use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Insert initial changelog entries if they don't exist.
        db.execute_unprepared(
            r#"
            INSERT INTO core.changelog (version, date, title, description, category, breaking_change)
            VALUES
                ('1.0.0', NOW(), 'Welcome to Ataqu', 'The unified SMB platform is live. All 10 apps are available.', 'new', false),
                ('1.0.0', NOW(), 'First Release', 'Initial launch of Ataqu with all core features.', 'new', false)
            ON CONFLICT (id) DO NOTHING;
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "DELETE FROM core.changelog WHERE version = '1.0.0';"
        ).await?;
        Ok(())
    }
}
