#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Trigger {
    Webhook { path: String },
    Schedule { cron: String },
    Event { event_type: String },
}
