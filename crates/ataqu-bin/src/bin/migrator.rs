use ataqu_infra_migration::Migrator;
use sea_orm::{Database, DbErr};
use sea_orm_migration::{MigratorTrait, SchemaManager};

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@127.0.0.1:5433/ataqu_test".to_string());
    println!("Migrator connecting to: {}", db_url);

    let db = Database::connect(&db_url).await?;
    let schema_manager = SchemaManager::new(&db);
    let migrations = Migrator::migrations();

    for (i, migration) in migrations.iter().enumerate() {
        let name = migration.name();
        println!("Applying migration {}: {}", i + 1, name);
        migration.up(&schema_manager).await?;
    }

    println!("✅ All migrations applied successfully.");
    Ok(())
}
