use axum::Router;
use crate::AppState;

pub fn spark_router() -> Router<AppState> {
    Router::new()
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
