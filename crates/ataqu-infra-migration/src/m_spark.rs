use sea_orm_migration::prelude::*;
use sea_orm_migration::async_trait::async_trait;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _conn = manager.get_connection();
        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_crm;").await?;
        
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _conn = manager.get_connection();
        
        Ok(())
    }
}