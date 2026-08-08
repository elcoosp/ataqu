use sea_orm::DatabaseConnection;

pub struct ChangelogService {
    _db: DatabaseConnection,
}

impl ChangelogService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { _db: db }
    }
}
