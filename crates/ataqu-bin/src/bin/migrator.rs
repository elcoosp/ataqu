use sea_orm::{Database, DbErr};
use ataqu_infra_migration::Migrator;
use sea_orm_migration::MigratorTrait;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    let db_url = "postgres://postgres:postgres@127.0.0.1:5433/ataqu_test";
    println!("Migrator connecting to: {}", db_url);

    let db = Database::connect(db_url).await?;
    Migrator::up(&db, None).await?;
    println!("Migrations applied successfully.");
    Ok(())
}
