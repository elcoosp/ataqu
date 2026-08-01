pub mod m20250101_000001_init;
mod m_dial;
#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m_dial::Migration)]
    }
}
