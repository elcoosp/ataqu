use sea_orm_migration::prelude::*;
mod m20250101_000001_core;
mod m_aegis;
mod m_dial;
mod m_spark;
mod m_vault;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250101_000001_core::Migration),
            Box::new(m_aegis::Migration),
            Box::new(m_dial::Migration),
            Box::new(m_spark::Migration),
            Box::new(m_vault::Migration),
        ]
    }
}