use sea_orm::Statement;
use sea_orm::*;
use serde;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;
use tracing::{error, warn};
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TrackingEvent {
    pub tenant_id: Uuid,
    pub contact_id: Uuid,
    pub event_type: String,
    pub metadata: serde_json::Value,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

pub struct EmailTrackingWriter {
    channel: mpsc::Receiver<TrackingEvent>,
    db_pool: DatabaseConnection,
    spill_dir: PathBuf,
    max_spill_size: u64,
    total_spill_size: u64,
}

impl EmailTrackingWriter {
    pub fn new(
        db_pool: DatabaseConnection,
        spill_dir: PathBuf,
        max_spill_size: u64,
    ) -> (Self, mpsc::Sender<TrackingEvent>) {
        let (tx, rx) = mpsc::channel(1000);
        let writer = Self {
            channel: rx,
            db_pool,
            spill_dir,
            max_spill_size,
            total_spill_size: 0,
        };
        (writer, tx)
    }

    pub async fn run(mut self) -> Result<(), anyhow::Error> {
        self.recover_spill().await?;
        while let Some(event) = self.channel.recv().await {
            if let Err(e) = self.insert_event(&event).await {
                warn!("DB insert failed, spilling event: {}", e);
                if let Err(spill_err) = self.spill_event(&event).await {
                    error!("Failed to spill event: {}", spill_err);
                }
            }
        }
        Ok(())
    }

    async fn insert_event(&self, event: &TrackingEvent) -> Result<(), DbErr> {
        let sql = r#"
            INSERT INTO collab_crm.email_tracking (tenant_id, contact_id, event_type, metadata, occurred_at)
            VALUES ($1, $2, $3, $4, $5)
        "#;
        self.db_pool
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                sql,
                vec![
                    event.tenant_id.into(),
                    event.contact_id.into(),
                    event.event_type.clone().into(),
                    event.metadata.clone().into(),
                    event.occurred_at.into(),
                ],
            ))
            .await?;
        Ok(())
    }

    async fn insert_batch(&self, events: &[TrackingEvent]) -> Result<(), anyhow::Error> {
        if events.is_empty() {
            return Ok(());
        }
        // Use a single INSERT with multiple rows to reduce round trips.
        let mut values = Vec::new();
        let mut params = Vec::new();
        let mut param_idx = 1;
        for event in events {
            values.push(format!(
                "(${}, ${}, ${}, ${}, ${})",
                param_idx,
                param_idx + 1,
                param_idx + 2,
                param_idx + 3,
                param_idx + 4
            ));
            params.push(event.tenant_id.into());
            params.push(event.contact_id.into());
            params.push(event.event_type.clone().into());
            params.push(event.metadata.clone().into());
            params.push(event.occurred_at.into());
            param_idx += 5;
        }
        let sql = format!(
            "INSERT INTO collab_crm.email_tracking (tenant_id, contact_id, event_type, metadata, occurred_at) VALUES {}",
            values.join(", ")
        );
        self.db_pool
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                &sql,
                params,
            ))
            .await?;
        Ok(())
    }

    async fn spill_event(&mut self, event: &TrackingEvent) -> Result<(), anyhow::Error> {
        let active_path = self.spill_dir.join("tracking_spill.jsonl");
        let line = serde_json::to_string(event)? + "\n";
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&active_path)
            .await?;
        file.write_all(line.as_bytes()).await?;
        self.total_spill_size += line.len() as u64;
        if self.total_spill_size > self.max_spill_size {
            warn!("Spill size exceeded cap, dropping events might happen");
        }
        Ok(())
    }

    async fn recover_spill(&mut self) -> Result<(), anyhow::Error> {
        let mut dir = tokio::fs::read_dir(&self.spill_dir).await?;
        let mut files_to_process = Vec::new();
        while let Some(entry) = dir.next_entry().await? {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("tracking_recovering_") && name.ends_with(".jsonl") {
                files_to_process.push(entry.path());
            }
        }

        let active = self.spill_dir.join("tracking_spill.jsonl");
        if active.exists() {
            let ts = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
            let id = Uuid::new_v4();
            let recovering = self
                .spill_dir
                .join(format!("tracking_recovering_{}_{}.jsonl", ts, id));
            tokio::fs::rename(&active, &recovering).await?;
            files_to_process.push(recovering);
        }

        for file in &files_to_process {
            self.process_file(file).await?;
        }

        for file in &files_to_process {
            tokio::fs::remove_file(file).await?;
        }
        Ok(())
    }

    async fn process_file(&self, path: &Path) -> Result<(), anyhow::Error> {
        use tokio::io::AsyncBufReadExt;
        let file = tokio::fs::File::open(path).await?;
        let reader = tokio::io::BufReader::new(file);
        let mut lines = reader.lines();
        let mut batch = Vec::with_capacity(100);
        while let Some(line) = lines.next_line().await? {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(event) = serde_json::from_str::<TrackingEvent>(&line) {
                batch.push(event);
                if batch.len() >= 100 {
                    if let Err(e) = self.insert_batch(&batch).await {
                        warn!("Failed to insert batch of recovered events: {}", e);
                    }
                    batch.clear();
                }
            } else {
                warn!("Invalid JSON line in spill file: {}", line);
            }
        }
        if !batch.is_empty()
            && let Err(e) = self.insert_batch(&batch).await
        {
            warn!(
                "Failed to insert remaining batch of recovered events: {}",
                e
            );
        }
        Ok(())
    }
}
