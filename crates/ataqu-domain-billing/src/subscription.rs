use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Subscription {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub plan: String,
    pub status: SubscriptionStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SubscriptionStatus {
    Active,
    Trialing,
    Canceled,
    PastDue,
}
