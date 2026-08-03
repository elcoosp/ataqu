use std::env;
use sea_orm::{Database, DbErr};
use ataqu_infra_migration::Migrator;
use sea_orm_migration::MigratorTrait;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    let _ = dotenvy::dotenv();

    let db_url = env::var("DATABASE_TEST_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .expect("DATABASE_TEST_URL or DATABASE_URL must be set");
    let db = Database::connect(&db_url).await?;
    Migrator::up(&db, None).await?;
    println!("Migrations applied successfully.");
    Ok(())
}
