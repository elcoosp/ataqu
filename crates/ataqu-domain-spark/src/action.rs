#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    /// Pause the workflow run until an approver approves it.
    RequestApproval { approver_role: String },
    SendEmail {
        to: String,
        subject: String,
        body: String,
    },
    UpdateRecord {
        table: String,
        record_id: String,
        fields: String,
    },
    CreateDialChannel {
        name: String,
        channel_type: String,
        participants: Vec<uuid::Uuid>,
    },
    SendDialMessage {
        channel_id: uuid::Uuid,
        content: String,
    },
    CreateCinqContact {
        name: String,
        email: String,
        phone: Option<String>,
    },
    CreateCinqActivity {
        contact_id: uuid::Uuid,
        activity_type: String,
        description: String,
    },
    ReserveVaultStock {
        variant_id: uuid::Uuid,
        quantity: i64,
    },
    AdjustVaultStock {
        variant_id: uuid::Uuid,
        delta: i64,
        reason: String,
    },
    CreateCinqLead {
        name: String,
        email: String,
        source: String,
    },
    Webhook {
        url: String,
        method: String,
        body: serde_json::Value,
        headers: std::collections::HashMap<String, String>,
    },
}
