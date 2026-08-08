use sea_orm::DatabaseConnection;
pub struct OnboardingService {
    _db: DatabaseConnection,
}
impl OnboardingService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { _db: db }
    }
}
