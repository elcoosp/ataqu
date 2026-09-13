use ataqu_infra_migration::Migrator;
use sea_orm::{Database, DbErr};
use sea_orm_migration::MigratorTrait;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    dotenvy::dotenv().ok();

    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set (in .env or environment)");

    println!("Migrator connecting to: {}", db_url);

    let db = Database::connect(&db_url).await?;

    Migrator::up(&db, None).await?;

    println!("All migrations applied successfully.");
    Ok(())
}
