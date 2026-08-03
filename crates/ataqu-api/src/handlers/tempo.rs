use axum::{Router, routing::get};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/calendars", get(|| async { "ok" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
