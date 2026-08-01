use sea_orm::Statement;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;
use tracing::{error, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
        let content = tokio::fs::read_to_string(path).await?;
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(event) = serde_json::from_str::<TrackingEvent>(line) {
                if let Err(e) = self.insert_event(&event).await {
                    warn!("Failed to insert recovered event: {}", e);
                }
            } else {
                warn!("Invalid JSON line in spill file: {}", line);
            }
        }
        Ok(())
    }
}
