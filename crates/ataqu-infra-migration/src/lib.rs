pub use sea_orm_migration::prelude::*;

pub mod m_aegis;
pub mod m_pause;
pub mod m_sond;
pub mod m_spark;
pub mod m_tempo;
pub mod m_vault;

pub struct Migrator;

#[sea_orm_migration::async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m_aegis::Migration),
            Box::new(m_pause::Migration),
            Box::new(m_sond::Migration),
            Box::new(m_spark::Migration),
            Box::new(m_tempo::Migration),
            Box::new(m_vault::Migration),
        ]
    }
}
