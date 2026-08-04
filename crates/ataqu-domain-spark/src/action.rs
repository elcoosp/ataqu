#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Action {
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
}
