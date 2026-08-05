use uuid::Uuid;

pub struct Subscription {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub plan: String,
    pub status: String,
}
