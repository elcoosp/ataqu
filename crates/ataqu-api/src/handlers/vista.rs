use axum::{Router, routing::get};
use crate::AppState;

pub async fn get_kpis() -> &'static str { "kpis" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/kpis", get(get_kpis))
}
