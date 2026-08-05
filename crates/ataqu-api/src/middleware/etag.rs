use axum::{
    extract::Request,
    http::{StatusCode, header},
    middleware::Next,
    response::Response,
};

pub async fn etag_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    // ADR-005: All mutations (PUT/PATCH) require If-Match ETags.
    if req.method() == axum::http::Method::PUT || req.method() == axum::http::Method::PATCH {
        if req.headers().get(header::IF_MATCH).is_none() {
            return Err(StatusCode::PRECONDITION_REQUIRED);
        }
    }
    Ok(next.run(req).await)
}
