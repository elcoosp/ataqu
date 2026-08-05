use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Invoice {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub amount: i64,
    pub status: InvoiceStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvoiceStatus {
    Draft,
    Pending,
    Paid,
    Overdue,
    Void,
}
