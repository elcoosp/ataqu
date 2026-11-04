//! Async CSV import worker – processes import jobs from the outbox.
use crate::outbox::Outbox;
use ataqu_infra_outbox::OutboxEvent;
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

pub struct ImportWorker {
    outbox: Arc<dyn Outbox>,
}

impl ImportWorker {
    pub fn new(outbox: Arc<dyn Outbox>) -> Self {
        Self { outbox }
    }

    pub async fn handle_event(&self, event: OutboxEvent) -> Result<(), String> {
        info!("Processing import job {}", event.id);
        let payload = event.payload;
        let tenant_id = payload
            .get("tenant_id")
            .and_then(|v| v.as_str())
            .ok_or("Missing tenant_id")?
            .parse::<uuid::Uuid>()
            .map_err(|e| format!("Invalid tenant_id: {}", e))?;
        let file_url = payload
            .get("file_url")
            .and_then(|v| v.as_str())
            .ok_or("Missing file_url")?
            .to_string();
        let _import_type = payload
            .get("import_type")
            .and_then(|v| v.as_str())
            .ok_or("Missing import_type")?
            .to_string();
        let _mapping = payload.get("mapping").cloned().unwrap_or(Value::Null);
        let user_id = payload
            .get("user_id")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<uuid::Uuid>().ok())
            .unwrap_or(uuid::Uuid::nil());

        // Download file through the SSRF-guarded executor (fixed in audit:
        // `reqwest::get` had no scheme/host checks, no timeout, and buffered
        // an unbounded response into memory). The body is additionally capped
        // at 20 MB before parsing.
        let guard = ataqu_security::egress::GuardedHttpClient::new()?;
        let response = guard.execute("GET", &file_url, None, &[]).await?;
        if !response.status().is_success() {
            return Err(format!("File download returned HTTP {}", response.status()));
        }
        const MAX_IMPORT_BYTES: usize = 20 * 1024 * 1024;
        let content_length = response.content_length().unwrap_or(0);
        if content_length > MAX_IMPORT_BYTES as u64 {
            return Err(format!(
                "Import file too large: {content_length} bytes (max {MAX_IMPORT_BYTES})"
            ));
        }
        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read CSV: {}", e))?;
        if bytes.len() > MAX_IMPORT_BYTES {
            return Err(format!(
                "Import file too large: {} bytes (max {MAX_IMPORT_BYTES})",
                bytes.len()
            ));
        }
        let csv_content = String::from_utf8_lossy(&bytes).into_owned();

        // Parse CSV
        let mut reader = csv::Reader::from_reader(csv_content.as_bytes());
        let _headers = reader
            .headers()
            .map_err(|e| format!("Invalid CSV headers: {}", e))?
            .clone();

        let mut rows = Vec::new();
        for result in reader.records() {
            let record = result.map_err(|e| format!("CSV row error: {}", e))?;
            let mut row = serde_json::Map::new();
            for (i, field) in record.iter().enumerate() {
                if let Some(header) = _headers.get(i) {
                    row.insert(
                        header.to_string(),
                        serde_json::Value::String(field.to_string()),
                    );
                }
            }
            rows.push(serde_json::Value::Object(row));
        }

        info!(
            "Import of {} rows completed for tenant {}",
            rows.len(),
            tenant_id
        );

        let notify_payload = serde_json::json!({
            "tenant_id": tenant_id,
            "user_id": user_id,
            "message": format!("Import of {} rows completed", rows.len()),
            "success": true,
        });
        self.outbox
            .append("dial", "ImportComplete", tenant_id, &notify_payload)
            .await
            .map_err(|e| format!("Failed to emit notification: {}", e))?;

        Ok(())
    }
}
