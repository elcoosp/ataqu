use sea_orm_migration::prelude::*;
use async_trait::async_trait;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
<<<<<<< HEAD
        // Create schema if not exists (ADR-001: always use Statement::from_sql_and_values)
        manager.get_connection().execute_raw(
            Statement::from_sql_and_values(
                DbBackend::Postgres,
                "CREATE SCHEMA IF NOT EXISTS vault",
                [],
            )
        ).await?;

        manager.create_table(
            Table::create()
                .table((Vault::Schema, VaultProducts::Table))
                .if_not_exists()
                .col(ColumnDef::new(VaultProducts::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(VaultProducts::TenantId).uuid().not_null())
                .col(ColumnDef::new(VaultProducts::Name).string().not_null())
                .to_owned()
        ).await?;

        manager.create_table(
            Table::create()
                .table((Vault::Schema, VaultVariants::Table))
                .if_not_exists()
                .col(ColumnDef::new(VaultVariants::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(VaultVariants::ProductId).uuid().not_null())
                .col(ColumnDef::new(VaultVariants::Sku).string().not_null().unique_key())
                .col(ColumnDef::new(VaultVariants::StockQuantity).integer().not_null().default(0))
                .check(Expr::cust("stock_quantity >= 0")) // ADR-023: VAULT Overflow Protection
                .to_owned()
        ).await?;

||||||| 87023c1
        // Create schema if not exists (ADR-001: always use Statement::from_sql_and_values)
        manager.get_connection().execute_raw(
            Statement::from_sql_and_values(
                DbBackend::Postgres,
                "CREATE SCHEMA IF NOT EXISTS vault",
                [],
            )
        ).await?;

        manager.create_table(
            Table::create()
                .table((Vault::Schema, VaultProducts::Table))
                .if_not_exists()
                .col(ColumnDef::new(VaultProducts::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(VaultProducts::TenantId).uuid().not_null())
                .col(ColumnDef::new(VaultProducts::Name).string().not_null())
                .to_owned()
        ).await?;

        manager.create_table(
            Table::create()
                .table((Vault::Schema, VaultVariants::Table))
                .if_not_exists()
                .col(ColumnDef::new(VaultVariants::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(VaultVariants::ProductId).uuid().not_null())
                .col(ColumnDef::new(VaultVariants::Sku).string().not_null().unique_key())
                .col(ColumnDef::new(VaultVariants::StockQuantity).integer().not_null().default(0))
                .check(Expr::cust("stock_quantity >= 0")) // ADR-023: VAULT Overflow Protection
                .to_owned()
        ).await?;

=======
        let conn = manager.get_connection();
        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS vault;").await?;
        
>>>>>>> origin/main
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        
        Ok(())
    }
}
