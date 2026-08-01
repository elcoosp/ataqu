use serde::{Deserialize, Serialize};

/// Command to create a new contact.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContact {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
}

/// Event emitted when a contact is created.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactCreated {
    pub contact_id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
}

/// Command to update a deal.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDeal {
    pub deal_id: String,
    pub stage: Option<String>,
    pub amount: Option<f64>,
}

/// Event emitted when a deal is updated.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealUpdated {
    pub deal_id: String,
    pub previous_stage: Option<String>,
    pub new_stage: Option<String>,
    pub previous_amount: Option<f64>,
    pub new_amount: Option<f64>,
}
