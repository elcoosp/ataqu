use axum::{Router, routing::get};
use crate::AppState;

pub async fn list_bookings() -> &'static str { "bookings" }
pub async fn create_booking() -> &'static str { "create booking" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/bookings", get(list_bookings).post(create_booking))
}
