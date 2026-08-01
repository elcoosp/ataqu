use sea_orm_migration::prelude::*;

mod m_dial;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m_dial::Migration)]
    }
}
