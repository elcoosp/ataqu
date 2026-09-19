// Registration regression: the API client calls this authenticated endpoint.
// Kept independent of AppState so the mount can be checked without external services.
#[test]
fn bulk_delete_submissions_is_mounted_in_authenticated_routes() {
    let source = include_str!("../src/handlers/sond.rs");
    let authenticated_routes = source
        .split("pub fn routes() -> Router<AppState> {")
        .nth(1)
        .expect("authenticated Sond router exists");
    assert!(
        authenticated_routes.contains("\"/submissions/bulk-delete\""),
        "bulk-delete endpoint must be mounted in the authenticated Sond router"
    );
    assert!(
        authenticated_routes.contains("axum::routing::post(bulk_delete_submissions)"),
        "bulk-delete route must invoke the existing POST handler"
    );
}
