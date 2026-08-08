# DIAL PDF Export & TEMPO CRM Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native PDF export for DIAL channels and fix the TEMPO CRM integration by adding an outbox consumer that creates CINQ activities for new bookings.

**Architecture:** Use the `printpdf` crate to generate PDF documents from message history. In the outbox dispatcher, add a handler for `TempoBookingCreatedForContact` that calls `CinqService::create_activity`.

**Tech Stack:** Rust, printpdf, Axum, SeaORM.

---

## File Structure
- **Modify:** `crates/ataqu-application/Cargo.toml`
- **Modify:** `crates/ataqu-application/src/dial_service.rs`
- **Modify:** `crates/ataqu-application/src/cinq_service.rs`
- **Modify:** `crates/ataqu-bin/src/main.rs`

---

### Task 1: DIAL PDF Export

**Files:**
- Modify: `crates/ataqu-application/Cargo.toml`
- Modify: `crates/ataqu-application/src/dial_service.rs`
- Modify: `crates/ataqu-api/src/handlers/dial.rs`

- [ ] **Step 1: Add dependency**

```toml
# In crates/ataqu-application/Cargo.toml
printpdf = "0.7.0"
```

- [ ] **Step 2: Implement PDF generation in DialService**

```rust
// In crates/ataqu-application/src/dial_service.rs
use printpdf::*;
use std::io::BufWriter;

pub async fn export_channel_pdf(
    &self,
    tenant_id: TenantId,
    channel_id: Uuid,
    requester_id: Uuid,
) -> DialResult<Vec<u8>> {
    let messages = self.list_messages(tenant_id, channel_id, requester_id, 10000, 0).await?;

    let (doc, page1, layer1) = PdfDocument::new("Channel Export", Mm(210.0), Mm(297.0), "Layer 1");
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();

    let mut y = 280.0;
    for msg in messages {
        let text = format!("[{}] {}: {}",
            chrono::DateTime::<chrono::Utc>::from(msg.created_at).to_rfc3339(),
            msg.author_id.as_uuid(),
            msg.content
        );
        layer1.use_text(text, 12.0, Mm(10.0), Mm(y), &font);
        y -= 10.0;
        if y < 20.0 { y = 280.0; } // Simple pagination logic
    }

    let mut buf = BufWriter::new(Vec::new());
    doc.save(&mut buf).map_err(|e| DialServiceError::Repository(e.to_string()))?;
    Ok(buf.into_inner().map_err(|e| DialServiceError::Repository(e.to_string()))?)
}
```

- [ ] **Step 3: Update API Handler**

```rust
// In crates/ataqu-api/src/handlers/dial.rs
pub async fn export_channel_pdf(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(channel_id): Path<Uuid>,
) -> ApiResult<impl axum::response::IntoResponse> {
    let data = state.dial_service.export_channel_pdf(auth.tenant_id, channel_id, auth.user_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok((
        StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE, "application/pdf".to_string()),
            (axum::http::header::CONTENT_DISPOSITION, format!("attachment; filename=\"channel_{}.pdf\"", channel_id)),
        ],
        data,
    ))
}
```
*Add route:* `.route("/channels/:id/export/pdf", axum::routing::get(export_channel_pdf))`

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-application/Cargo.toml crates/ataqu-application/src/dial_service.rs crates/ataqu-api/src/handlers/dial.rs
git commit -m "feat(dial): implement PDF export for channel messages"
```

---

### Task 2: TEMPO CRM Integration (Outbox Consumer)

**Files:**
- Modify: `crates/ataqu-application/src/cinq_service.rs`
- Modify: `crates/ataqu-bin/src/main.rs`

- [ ] **Step 1: Add CINQ consumer method**

```rust
// In crates/ataqu-application/src/cinq_service.rs
use ataqu_infra_outbox::OutboxEvent;

pub async fn process_tempo_booking_event(&self, event: &OutboxEvent) -> CinqResult<()> {
    if event.schema == "collab_ops" && event.event_type == "TempoBookingCreatedForContact" {
        let contact_id = event.payload.get("contact_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
            .ok_or(CinqServiceError::Validation("Missing contact_id".to_string()))?;

        let starts_at = event.payload.get("starts_at")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let tenant_id = event.payload.get("tenant_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
            .unwrap_or_default();

        let cmd = CreateActivityCommand {
            tenant_id: TenantId::new(tenant_id),
            contact_id,
            deal_id: None,
            activity_type: ataqu_domain_cinq::activity::ActivityType::Meeting,
            description: format!("Scheduled meeting for {}", starts_at),
            scheduled_at: chrono::DateTime::parse_from_rfc3339(starts_at).ok().map(|dt| dt.with_timezone(&chrono::Utc)),
        };

        self.create_activity(cmd).await?;
    }
    Ok(())
}
```

- [ ] **Step 2: Add handler in outbox dispatcher in `main.rs`**

Find the outbox dispatcher closure in `crates/ataqu-bin/src/main.rs` and add:
```rust
let cinq_service_clone = cinq_service.clone();
// ... inside handler ...
if let Err(e) = cinq_service_clone.process_tempo_booking_event(&event).await {
    tracing::error!(error = %e, "CINQ failed to process TEMPO booking event");
    return Err(ataqu_infra_outbox::DispatcherError::Handler(e.to_string()));
}
```

- [ ] **Step 3: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-application/src/cinq_service.rs crates/ataqu-bin/src/main.rs
git commit -m "feat(cinq): consume TEMPO booking events to create activities"
```
