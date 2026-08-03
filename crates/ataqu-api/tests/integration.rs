use std::env;

#[tokio::test]
async fn test_db_connection() {
    let _ = dotenvy::dotenv();

    let default_url = "postgres://postgres:postgres@localhost:5432/ataqu_test";
    let db_url = env::var("DATABASE_TEST_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .unwrap_or_else(|_| default_url.to_string());

    let db_url = if db_url.contains("://postgres@") {
        db_url.replace("://postgres@", "://postgres:postgres@")
    } else {
        db_url
    };

    let _db = sea_orm::Database::connect(&db_url)
        .await
        .expect("Failed to connect to test DB");
    println!("Connected to test DB successfully");
}
