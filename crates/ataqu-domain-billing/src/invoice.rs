use uuid::Uuid;

pub struct Invoice {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub amount: i64,
    pub status: String,
}
