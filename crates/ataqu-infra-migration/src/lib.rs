use sea_orm_migration::prelude::*;

pub mod m_aegis;
pub mod m_cinq;
pub mod m_dial;
pub mod m_pause;
pub mod m_pivot;
pub mod m_sond;
pub mod m_spark;
pub mod m_tempo;
pub mod m_vault;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m_aegis::Migration),
            Box::new(m_cinq::Migration),
            Box::new(m_dial::Migration),
            Box::new(m_pause::Migration),
            Box::new(m_pivot::Migration),
            Box::new(m_sond::Migration),
            Box::new(m_spark::Migration),
            Box::new(m_tempo::Migration),
            Box::new(m_vault::Migration),
        ]
    }
}
