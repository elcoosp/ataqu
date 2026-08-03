use std::env;

#[tokio::test]
async fn test_db_connection() {
    let db_url = env::var("DATABASE_TEST_URL")
        .expect("DATABASE_TEST_URL must be set");
    let _db = sea_orm::Database::connect(&db_url)
        .await
        .expect("Failed to connect to test DB");
    println!("Connected to test DB successfully");
}
