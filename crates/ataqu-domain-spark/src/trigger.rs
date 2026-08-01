#[derive(Debug, Clone, PartialEq)]
pub enum Trigger {
    Webhook { path: String },
    Schedule { cron: String },
    Event { event_type: String },
}
