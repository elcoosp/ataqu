# TASK-074: Idempotency & S3 Storage Fixes

## Objective
Fix the semi-implemented idempotency layer to use PostgreSQL for durable storage (ADR-006) and migrate file uploads from local disk to S3 presigned URLs (ADR-027).

## Execution Boundaries
- `crates/ataqu-api/src/middleware/idempotency.rs` (modify)
- `crates/ataqu-infra-storage/src/s3_service.rs` (create)
- `crates/ataqu-infra-storage/src/lib.rs` (modify)
- `crates/ataqu-infra-storage/Cargo.toml` (add aws‑sdk‑s3 dependencies)
- `crates/ataqu-api/src/handlers/dial.rs` (modify)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Rewrite idempotency middleware**
   Replace the Moka‑only cache with calls to `IdempotencyGuard` to store durable responses in `core.idempotency_records`. Use `Idempotency-Key` header to derive a deterministic `command_id`. On success, commit; on failure, rollback.

2. **Implement `S3Service`**
   Provide `generate_upload_url(key: &str) -> Result<String, String>` that generates a presigned PUT URL valid for 1 hour.

3. **Update DIAL upload handler**
   Modify the `upload_file` handler to generate a presigned URL via `S3Service` and return it along with `file_id`.

4. **Replace stubs in `main.rs`**
   Initialise `S3Service` with bucket from env `S3_BUCKET`. Pass it to `AppState`. Also replace the `idempotency_guard` stub with the real `IdempotencyGuard`.

## Success Criteria & Verification
- [ ] Idempotency middleware uses durable storage and returns cached responses on repeated requests.
- [ ] S3 presigned URL generation works with proper environment variables.
- [ ] DIAL upload endpoint returns a URL and file ID.
- [ ] `cargo check --workspace` passes.
