use uuid::Uuid;

pub struct GdprSagaState {
    pub tenant_id: Uuid,
    pub trace_id: String,
    pub step: u32,
    pub status: String,
}

pub fn init_saga(tenant_id: Uuid, trace_id: String) -> GdprSagaState {
    GdprSagaState {
        tenant_id,
        trace_id,
        step: 0,
        status: "pending".to_string(),
    }
}
