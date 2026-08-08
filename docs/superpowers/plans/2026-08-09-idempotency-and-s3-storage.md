# Idempotency & S3 Storage Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the semi-implemented idempotency layer to use PostgreSQL for durable storage (ADR-006) and migrate file uploads from local disk to S3 presigned URLs (ADR-027).

**Architecture:** Replace the global Moka cache in `idempotency_middleware` with calls to the `IdempotencyGuard`. Add an `S3Service` to generate presigned URLs for direct browser uploads.

**Tech Stack:** Rust, AWS SDK for Rust, SeaORM, Axum.

---

## File Structure
- **Modify:** `crates/ataqu-api/src/middleware/idempotency.rs`
- **Modify:** `crates/ataqu-api/src/lib.rs` (Inject IdempotencyGuard into AppState)
- **Create:** `crates/ataqu-infra-storage/src/s3_service.rs`
- **Modify:** `crates/ataqu-infra-storage/src/lib.rs`
- **Modify:** `crates/ataqu-api/src/handlers/dial.rs`

---

### Task 1: Durable Idempotency Middleware

**Files:**
- Modify: `crates/ataqu-api/src/middleware/idempotency.rs`
- Modify: `crates/ataqu-api/src/lib.rs`

- [ ] **Step 1: Update AppState in lib.rs**

```rust
// crates/ataqu-api/src/lib.rs
// Add to AppState:
pub idempotency_guard: Arc<dyn ataqu_application::pause_service::IdempotencyPort + Send + Sync>,
```

- [ ] **Step 2: Rewrite idempotency_middleware**

```rust
// crates/ataqu-api/src/middleware/idempotency.rs
use axum::body::{Body, to_bytes};
use axum::extract::Request;
use axum::http::StatusCode;
use axum::http::header;
use axum::middleware::Next;
use axum::response::Response;
use sha2::{Digest, Sha256};
use uuid::Uuid;
use serde_json::json;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

pub async fn idempotency_middleware(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let is_multipart = req
        .headers()
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.starts_with("multipart/form-data"))
        .unwrap_or(false);

    if !is_multipart
        && (req.method() == axum::http::Method::POST
            || req.method() == axum::http::Method::PUT
            || req.method() == axum::http::Method::PATCH
            || req.method() == axum::http::Method::DELETE)
    {
        if let Some(key) = req
            .headers()
            .get(IDEMPOTENCY_KEY_HEADER)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
        {
            let (parts, body) = req.into_parts();
            let bytes = to_bytes(body, 1024 * 1024)
                .await
                .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;

            let tenant_id = parts
                .extensions
                .get::<crate::middleware::AuthContext>()
                .map(|a| a.tenant_id.as_uuid().to_string())
                .unwrap_or_default();

            let method = parts.method.as_str();
            let path = parts.uri.path();

            let mut hasher = Sha256::new();
            hasher.update(key.as_bytes());
            hasher.update(tenant_id.as_bytes());
            hasher.update(method.as_bytes());
            hasher.update(path.as_bytes());
            let hash = hasher.finalize();
            let command_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, &hash);

            // Check durable store
            let guard = match state.idempotency_guard.acquire(&command_id).await {
                Ok(g) => g,
                Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
            };

            if guard.is_cached() {
                let cached_resp = guard.get_cached::<serde_json::Value>()
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                let mut resp = Response::new(Body::from(serde_json::to_vec(&cached_resp).unwrap()));
                *resp.status_mut() = StatusCode::OK;
                resp.headers_mut().insert(header::CONTENT_TYPE, "application/json".parse().unwrap());
                return Ok(resp);
            }

            req = Request::from_parts(parts, Body::from(bytes));

            let resp = next.run(req).await;

            let status = resp.status();
            let should_cache = status.is_success()
                || (status.is_client_error()
                    && status != StatusCode::UNAUTHORIZED
                    && status != StatusCode::FORBIDDEN
                    && status != StatusCode::TOO_MANY_REQUESTS);

            if should_cache {
                let (parts, body) = resp.into_parts();
                let bytes = to_bytes(body, 1024 * 1024)
                    .await
                    .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;

                let body_val: serde_json::Value = serde_json::from_slice(&bytes).unwrap_or(json!({}));

                if let Err(e) = state.idempotency_guard.commit(&command_id, body_val).await {
                    tracing::error!("Failed to commit idempotency record: {}", e);
                }

                return Ok(Response::from_parts(parts, Body::from(bytes)));
            }

            // If we shouldn't cache, rollback the in-progress record
            let _ = state.idempotency_guard.rollback(&command_id).await;
            return Ok(resp);
        }
    }
    Ok(next.run(req).await)
}
```

- [ ] **Step 3: Update main.rs to inject the guard**

```rust
// In crates/ataqu-bin/src/main.rs
// Use the existing RealIdempotency created for PauseService for the whole API
// Add `idempotency_guard: pause_idempotency.clone()` to AppState initialization
```

- [ ] **Step 4: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-api/src/middleware/idempotency.rs crates/ataqu-api/src/lib.rs crates/ataqu-bin/src/main.rs
git commit -m "fix(api): use durable IdempotencyGuard in middleware"
```

---

### Task 2: S3 Service for Presigned URLs

**Files:**
- Create:** `crates/ataqu-infra-storage/src/s3_service.rs`
- Modify:** `crates/ataqu-infra-storage/src/lib.rs`
- Modify:** `crates/ataqu-infra-storage/Cargo.toml`

- [ ] **Step 1: Add dependencies**

```toml
# crates/ataqu-infra-storage/Cargo.toml
[dependencies]
aws-config = { version = "1.5", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1.40"
tokio = { version = "1.52", features = ["full"] }
```

- [ ] **Step 2: Write S3Service**

```rust
// crates/ataqu-infra-storage/src/s3_service.rs
use aws_sdk_s3::presigning::PresigningConfig;
use std::time::Duration;

pub struct S3Service {
    client: aws_sdk_s3::Client,
    bucket: String,
}

impl S3Service {
    pub async fn new(bucket: String) -> Self {
        let config = aws_config::load_from_env().await;
        let client = aws_sdk_s3::Client::new(&config);
        Self { client, bucket }
    }

    pub async fn generate_upload_url(&self, key: &str) -> Result<String, String> {
        let presigning_config = PresigningConfig::builder()
            .expires_in(Duration::from_secs(3600))
            .build()
            .map_err(|e| e.to_string())?;

        let presigned = self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(presigning_config)
            .await
            .map_err(|e| e.to_string())?;

        Ok(presigned.uri().to_string())
    }
}
```

- [ ] **Step 3: Export module**

```rust
// crates/ataqu-infra-storage/src/lib.rs
pub mod s3_service;
```

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-infra-storage/
git commit -m "feat(infra): add S3Service for presigned URLs"
```

---

### Task 3: Update DIAL Upload Handler

**Files:**
- Modify: `crates/ataqu-api/src/handlers/dial.rs`
- Modify: `crates/ataqu-api/src/lib.rs` (Add `s3_service` to AppState)
- Modify: `crates/ataqu-bin/src/main.rs` (Init S3Service)

- [ ] **Step 1: Modify upload_file handler**

```rust
// In crates/ataqu-api/src/handlers/dial.rs
pub async fn upload_file(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    let file_id = uuid::Uuid::now_v7();
    let key = format!("uploads/{}/{}", auth.tenant_id.as_uuid(), file_id);

    let url = state.s3_service.generate_upload_url(&key).await
        .map_err(|e| ApiResponseError::internal(&e))?;

    Ok(Json(serde_json::json!({
        "upload_url": url,
        "file_id": file_id
    })))
}
```

- [ ] **Step 2: Wire up in lib.rs and main.rs**

```rust
// In crates/ataqu-api/src/lib.rs
pub s3_service: Arc<ataqu_infra_storage::s3_service::S3Service>,

// In crates/ataqu-bin/src/main.rs
let s3_bucket = std::env::var("S3_BUCKET").unwrap_or_else(|_| "ataqu-uploads".to_string());
let s3_service = Arc::new(ataqu_infra_storage::s3_service::S3Service::new(s3_bucket).await);
// Add `s3_service` to AppState
```

- [ ] **Step 3: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-api/src/handlers/dial.rs crates/ataqu-api/src/lib.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(api): update DIAL upload to return S3 presigned URL"
```
