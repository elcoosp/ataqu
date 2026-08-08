use sea_orm::DatabaseConnection;

#[derive(Clone)]
pub struct HealthService {
    db: DatabaseConnection,
}

impl HealthService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}
