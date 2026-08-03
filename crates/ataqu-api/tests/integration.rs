#[tokio::test]
async fn test_db_connection() {
    let db_url = "postgres://postgres:postgres@127.0.0.1:5433/ataqu_test";
    println!("Test connecting to: {}", db_url);

    let _db = sea_orm::Database::connect(db_url)
        .await
        .expect("Failed to connect to test DB");
    println!("Connected to test DB successfully");
}
