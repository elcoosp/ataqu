pub mod aegis;
pub mod cinq;
pub mod dial;
pub mod pivot;
pub mod spark;
pub mod vault;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: u64,
    pub limit: u64,
    pub offset: u64,
}
