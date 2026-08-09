# TASK-073: DIAL PDF Export & TEMPO CRM Integration

## Objective
Add native PDF export for DIAL channels and fix the TEMPO CRM integration by adding an outbox consumer that creates CINQ activities for new bookings.

## Execution Boundaries
- `crates/ataqu-application/Cargo.toml` (add `printpdf` dependency)
- `crates/ataqu-application/src/dial_service.rs` (modify)
- `crates/ataqu-api/src/handlers/dial.rs` (modify)
- `crates/ataqu-application/src/cinq_service.rs` (modify)
- `crates/ataqu-bin/src/main.rs` (modify)

## Step-by-Step Implementation Details

1. **Add `printpdf` dependency** to `ataqu-application/Cargo.toml`.

2. **Implement PDF generation in `DialService`**
   Add `export_channel_pdf` that fetches messages and renders them to a PDF using `printpdf`. Return `Vec<u8>`.

3. **Add API handler**
   Add `GET /channels/:id/export/pdf` that streams the PDF with correct headers.

4. **Implement outbox consumer in `CinqService`**
   Add `process_tempo_booking_event` that listens for `TempoBookingCreatedV1` and creates a CINQ activity.

5. **Hook the consumer in `main.rs`**
   In the outbox dispatcher closure, call the consumer on relevant events.

## Success Criteria & Verification
- [ ] PDF export generates a valid PDF with message history.
- [ ] API returns PDF with correct headers.
- [ ] TEMPO booking event is consumed and creates an activity in CINQ.
- [ ] `cargo check --workspace` passes.
