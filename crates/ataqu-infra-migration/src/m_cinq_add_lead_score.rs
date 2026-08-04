use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_crm.contacts
            ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0;
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_crm.contacts
            DROP COLUMN IF EXISTS lead_score;
            "#,
        )
        .await?;
        Ok(())
    }
}
