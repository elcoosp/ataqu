use axum::Router;
use crate::AppState;

pub fn spark_router() -> Router<AppState> {
    Router::new()
}
