use sea_orm::DbErr;

pub struct BatchResult {
    pub successes: Vec<uuid::Uuid>,
    pub failures: Vec<DLQEntry>,
}

impl BatchResult {
    pub fn partial(successes: Vec<uuid::Uuid>, failures: Vec<DLQEntry>) -> Self {
        Self {
            successes,
            failures,
        }
    }
}

pub struct DLQEntry {
    pub item: serde_json::Value,
    pub error: String,
}

impl DLQEntry {
    pub fn new(item: serde_json::Value, error: String) -> Self {
        Self { item, error }
    }
}

pub fn extract_db_err(e: &DbErr) -> Option<&dyn sqlx::error::DatabaseError> {
    if let DbErr::Query(sea_orm::RuntimeErr::SqlxError(sqlx_err)) = e
        && let sqlx::Error::Database(db_err) = &**sqlx_err
    {
        Some(&**db_err)
    } else {
        None
    }
}

pub async fn process_batch<T, F, Fut>(items: &[T], insert_fn: F) -> Result<BatchResult, DbErr>
where
    T: Send + Sync + serde::Serialize + 'static,
    F: Fn(&[T]) -> Fut + Send + Sync + 'static,
    Fut: std::future::Future<Output = Result<(), DbErr>> + Send,
{
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for item in items {
        match insert_fn(std::slice::from_ref(item)).await {
            Ok(_) => {
                if let Ok(val) = serde_json::to_value(item)
                    && let Some(id) = val
                        .get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                {
                    successes.push(uuid::Uuid::parse_str(&id).unwrap_or_default());
                }
            }
            Err(e) => {
                let item_val = serde_json::to_value(item).unwrap_or(serde_json::Value::Null);
                failures.push(DLQEntry::new(item_val, e.to_string()));
            }
        }
    }
    Ok(BatchResult::partial(successes, failures))
}
