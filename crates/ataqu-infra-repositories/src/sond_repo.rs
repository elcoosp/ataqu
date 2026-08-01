use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{ActiveValue::Set, DatabaseTransaction, DbBackend, Statement};
use serde_json::Value as JsonValue;
use uuid::Uuid;

pub mod form_entity {
    use sea_orm::entity::prelude::*;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "forms", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub title: String,
        pub description: Option<String>,
        #[sea_orm(column_type = "JsonBinary")]
        pub schema_json: Json,
        pub is_active: bool,
        pub created_at: DateTimeWithTimeZone,
        pub updated_at: DateTimeWithTimeZone,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod submission_entity {
    use sea_orm::entity::prelude::*;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "submissions", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub form_id: Uuid,
        pub respondent_id: Option<Uuid>,
        #[sea_orm(column_type = "JsonBinary")]
        pub response_data: Json,
        pub submitted_at: DateTimeWithTimeZone,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

#[derive(Debug, Clone, PartialEq)]
pub struct Form {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub schema_json: JsonValue,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Submission {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub form_id: Uuid,
    pub respondent_id: Option<Uuid>,
    pub response_data: JsonValue,
    pub submitted_at: DateTime<Utc>,
}

fn map_form(m: form_entity::Model) -> Form {
    Form {
        id: m.id,
        tenant_id: m.tenant_id,
        title: m.title,
        description: m.description,
        schema_json: m.schema_json,
        is_active: m.is_active,
        created_at: m.created_at.into(),
        updated_at: m.updated_at.into(),
    }
}

#[allow(dead_code)]
fn map_submission(m: submission_entity::Model) -> Submission {
    Submission {
        id: m.id,
        tenant_id: m.tenant_id,
        form_id: m.form_id,
        respondent_id: m.respondent_id,
        response_data: m.response_data,
        submitted_at: m.submitted_at.into(),
    }
}

#[allow(async_fn_in_trait)]
pub trait SondRepository: Send + Sync {
    async fn create_form(
        &self,
        txn: &mut DatabaseTransaction,
        form: &Form,
    ) -> Result<(), sea_orm::DbErr>;
    async fn get_form(
        &self,
        txn: &DatabaseTransaction,
        tenant_id: Uuid,
        form_id: Uuid,
    ) -> Result<Option<Form>, sea_orm::DbErr>;
    async fn list_forms(
        &self,
        txn: &DatabaseTransaction,
        tenant_id: Uuid,
    ) -> Result<Vec<Form>, sea_orm::DbErr>;
    async fn insert_submissions_batch(
        &self,
        txn: &mut DatabaseTransaction,
        submissions: &[Submission],
    ) -> Result<BatchResult, sea_orm::DbErr>;
}

#[derive(Debug, Clone)]
pub struct BatchResult {
    pub successes: Vec<Uuid>,
    pub failures: Vec<DlqEntry>,
}

impl BatchResult {
    pub fn partial(successes: Vec<Uuid>, failures: Vec<DlqEntry>) -> Self {
        Self {
            successes,
            failures,
        }
    }
    pub fn all_success(ids: Vec<Uuid>) -> Self {
        Self {
            successes: ids,
            failures: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct DlqEntry {
    pub item: Submission,
    pub error: String,
}

pub struct SeaOrmSondRepository;

impl SeaOrmSondRepository {
    pub fn new() -> Self {
        Self
    }
}

impl Default for SeaOrmSondRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl SondRepository for SeaOrmSondRepository {
    async fn create_form(
        &self,
        txn: &mut DatabaseTransaction,
        form: &Form,
    ) -> Result<(), sea_orm::DbErr> {
        let active = form_entity::ActiveModel {
            id: Set(form.id),
            tenant_id: Set(form.tenant_id),
            title: Set(form.title.clone()),
            description: Set(form.description.clone()),
            schema_json: Set(form.schema_json.clone()),
            is_active: Set(form.is_active),
            created_at: Set(form.created_at.into()),
            updated_at: Set(form.updated_at.into()),
        };
        active.insert(txn).await?;
        Ok(())
    }

    async fn get_form(
        &self,
        txn: &DatabaseTransaction,
        tenant_id: Uuid,
        form_id: Uuid,
    ) -> Result<Option<Form>, sea_orm::DbErr> {
        let result = form_entity::Entity::find()
            .filter(form_entity::Column::Id.eq(form_id))
            .filter(form_entity::Column::TenantId.eq(tenant_id))
            .one(txn)
            .await?;
        Ok(result.map(map_form))
    }

    async fn list_forms(
        &self,
        txn: &DatabaseTransaction,
        tenant_id: Uuid,
    ) -> Result<Vec<Form>, sea_orm::DbErr> {
        let models = form_entity::Entity::find()
            .filter(form_entity::Column::TenantId.eq(tenant_id))
            .filter(form_entity::Column::IsActive.eq(true))
            .all(txn)
            .await?;
        Ok(models.into_iter().map(map_form).collect())
    }

    async fn insert_submissions_batch(
        &self,
        txn: &mut DatabaseTransaction,
        submissions: &[Submission],
    ) -> Result<BatchResult, sea_orm::DbErr> {
        if submissions.is_empty() {
            return Ok(BatchResult::all_success(Vec::new()));
        }

        let mut successes = Vec::with_capacity(submissions.len());
        let mut failures = Vec::new();
        let chunk_size: usize = 100;

        for chunk in submissions.chunks(chunk_size) {
            txn.execute_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SAVEPOINT chunk_sp",
                [],
            ))
            .await?;

            match insert_submission_chunk(txn, chunk).await {
                Ok(_) => {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "RELEASE SAVEPOINT chunk_sp",
                        [],
                    ))
                    .await?;
                    successes.extend(chunk.iter().map(|s| s.id));
                }
                Err(e) => {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "ROLLBACK TO SAVEPOINT chunk_sp",
                        [],
                    ))
                    .await?;
                    tracing::warn!(error = ?e, chunk_size = chunk.len(), "SOND submission chunk failed");

                    if !is_data_level_error(&e) {
                        return Err(e);
                    }

                    for item in chunk {
                        txn.execute_raw(Statement::from_sql_and_values(
                            DbBackend::Postgres,
                            "SAVEPOINT item_sp",
                            [],
                        ))
                        .await?;
                        match insert_submission_chunk(txn, std::slice::from_ref(item)).await {
                            Ok(_) => {
                                txn.execute_raw(Statement::from_sql_and_values(
                                    DbBackend::Postgres,
                                    "RELEASE SAVEPOINT item_sp",
                                    [],
                                ))
                                .await?;
                                successes.push(item.id);
                            }
                            Err(item_err) => {
                                txn.execute_raw(Statement::from_sql_and_values(
                                    DbBackend::Postgres,
                                    "ROLLBACK TO SAVEPOINT item_sp",
                                    [],
                                ))
                                .await?;
                                failures.push(DlqEntry {
                                    item: item.clone(),
                                    error: item_err.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
        Ok(BatchResult::partial(successes, failures))
    }
}

async fn insert_submission_chunk(
    txn: &mut DatabaseTransaction,
    chunk: &[Submission],
) -> Result<(), sea_orm::DbErr> {
    if chunk.is_empty() {
        return Ok(());
    }
    let models: Vec<submission_entity::ActiveModel> = chunk
        .iter()
        .map(|s| submission_entity::ActiveModel {
            id: Set(s.id),
            tenant_id: Set(s.tenant_id),
            form_id: Set(s.form_id),
            respondent_id: Set(s.respondent_id),
            response_data: Set(s.response_data.clone()),
            submitted_at: Set(s.submitted_at.into()),
        })
        .collect();
    submission_entity::Entity::insert_many(models)
        .exec(txn)
        .await?;
    Ok(())
}

fn is_data_level_error(e: &sea_orm::DbErr) -> bool {
    let err_str = e.to_string().to_lowercase();
    err_str.contains("unique violation")
        || err_str.contains("foreign key violation")
        || err_str.contains("check violation")
        || err_str.contains("violates not-null")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_result_all_success() {
        let ids = vec![Uuid::new_v4(), Uuid::new_v4()];
        let result = BatchResult::all_success(ids.clone());
        assert_eq!(result.successes, ids);
        assert!(result.failures.is_empty());
    }

    #[test]
    fn test_batch_result_partial() {
        let fail_item = Submission {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            form_id: Uuid::new_v4(),
            respondent_id: None,
            response_data: serde_json::json!({"q1": "a1"}),
            submitted_at: Utc::now(),
        };
        let result = BatchResult::partial(
            vec![Uuid::new_v4()],
            vec![DlqEntry {
                item: fail_item.clone(),
                error: "dup".into(),
            }],
        );
        assert_eq!(result.failures.len(), 1);
        assert_eq!(result.failures[0].item.id, fail_item.id);
    }

    #[test]
    fn test_is_data_level_error_custom() {
        let err = sea_orm::DbErr::Custom("timeout".into());
        assert!(!is_data_level_error(&err));
    }

    #[test]
    fn test_empty_batch() {
        let result = BatchResult::all_success(Vec::new());
        assert!(result.successes.is_empty());
    }
}
