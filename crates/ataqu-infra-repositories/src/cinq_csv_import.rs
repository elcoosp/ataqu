use crate::entities::contact;
use ataqu_kernel::Identifiable;
use sea_orm::Statement;
use sea_orm::*;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone)]
pub struct ContactImportItem {
    pub id: Uuid,
    pub model: contact::ActiveModel,
}

impl Identifiable for ContactImportItem {
    fn id(&self) -> Uuid {
        self.id
    }
}

pub struct CsvImporter {
    db: DatabaseConnection,
}

impl CsvImporter {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn import_contacts(
        &self,
        tenant_id: Uuid,
        rows: Vec<HashMap<String, String>>,
        now: chrono::DateTime<chrono::Utc>,
    ) -> Result<Vec<Uuid>, DbErr> {
        let mut items = Vec::new();
        for row in rows {
            let name = row.get("name").cloned().unwrap_or_default();
            let email = row.get("email").cloned();
            let phone = row.get("phone").cloned();
            let mut custom = serde_json::Map::new();
            for (k, v) in row {
                if !["name", "email", "phone"].contains(&k.as_str()) {
                    custom.insert(k, serde_json::Value::String(v));
                }
            }
            let custom_fields = serde_json::Value::Object(custom);
            let id = Uuid::new_v4();
            let model = contact::ActiveModel {
                id: ActiveValue::Set(id),
                tenant_id: ActiveValue::Set(tenant_id),
                name: ActiveValue::Set(name),
                email: ActiveValue::Set(email),
                phone: ActiveValue::Set(phone),
                custom_fields: ActiveValue::Set(custom_fields),
                created_at: ActiveValue::Set(now),
                updated_at: ActiveValue::Set(now),
            };
            items.push(ContactImportItem { id, model });
        }

        let chunk_size = 100;
        let txn = self.db.begin().await?;
        let mut inserted_ids = Vec::new();

        for chunk in items.chunks(chunk_size) {
            txn.execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                "SAVEPOINT chunk_sp",
                [],
            ))
            .await?;

            let mut chunk_ok = true;
            for item in chunk {
                match item.model.clone().insert(&txn).await {
                    Ok(model) => inserted_ids.push(model.id),
                    Err(e) => {
                        txn.execute_raw(Statement::from_sql_and_values(
                            DatabaseBackend::Postgres,
                            "ROLLBACK TO SAVEPOINT chunk_sp",
                            [],
                        ))
                        .await?;
                        tracing::warn!("Failed to insert contact: {}", e);
                        chunk_ok = false;
                        break;
                    }
                }
            }
            if chunk_ok {
                txn.execute_raw(Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    "RELEASE SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;
            }
        }
        txn.commit().await?;
        Ok(inserted_ids)
    }
}
