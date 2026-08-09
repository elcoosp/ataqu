use crate::entities::contact;
use crate::entities::contact::Entity as ContactEntity;
use dashmap::DashMap;
use sea_orm::sea_query::Expr;
use sea_orm::*;
use serde_json::{Value as JsonValue, json};
use std::sync::Arc;
use std::time::Instant;
use tracing::warn;
use uuid::Uuid;

// Simple per-tenant rate limiter for cross-field search (Tier 3)
#[derive(Clone)]
pub struct CrossFieldRateLimiter {
    inner: Arc<DashMap<Uuid, (Instant, usize)>>,
    window_duration: std::time::Duration,
    max_requests: usize,
}

impl CrossFieldRateLimiter {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(DashMap::new()),
            window_duration: std::time::Duration::from_secs(10),
            max_requests: 1,
        }
    }

    #[allow(clippy::question_mark)]
    #[allow(clippy::needless_return, clippy::question_mark)]
    pub async fn check_and_consume(&self, tenant_id: Uuid) -> Result<(), &'static str> {
        let now = Instant::now();
        let mut entry = self.inner.entry(tenant_id).or_insert((now, 0));
        if now.duration_since(entry.0) < self.window_duration {
            if entry.1 >= self.max_requests {
                Err("rate limit exceeded")
            } else {
                entry.1 += 1;
                Ok(())
            }
        } else {
            entry.0 = now;
            entry.1 = 1;
            Ok(())
        }
    }
}

impl Default for CrossFieldRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

pub struct ContactRepository {
    db: DatabaseConnection,
    rate_limiter: CrossFieldRateLimiter,
}

impl ContactRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            rate_limiter: CrossFieldRateLimiter::new(),
        }
    }

    // Tier 1: Exact match on custom_fields (uses GIN index)
    pub async fn find_by_custom_field_exact(
        &self,
        tenant_id: Uuid,
        field: &str,
        value: &JsonValue,
    ) -> Result<Vec<contact::Model>, DbErr> {
        let obj = json!({ field: value });
        let cond = Condition::all()
            .add(contact::Column::TenantId.eq(tenant_id))
            .add(Expr::cust_with_values(
                "custom_fields @> $1",
                vec![obj.into()] as Vec<sea_orm::Value>,
            ));
        ContactEntity::find().filter(cond).all(&self.db).await
    }

    // Tier 2: Single-field text search (ILIKE)
    pub async fn find_by_custom_field_text(
        &self,
        tenant_id: Uuid,
        field: &str,
        search: &str,
    ) -> Result<Vec<contact::Model>, DbErr> {
        let pattern = format!("%{}%", search);
        let cond = Condition::all()
            .add(contact::Column::TenantId.eq(tenant_id))
            .add(Expr::cust_with_values(
                "custom_fields ->> $1 ILIKE $2",
                vec![field.into(), pattern.into()] as Vec<sea_orm::Value>,
            ));
        ContactEntity::find().filter(cond).all(&self.db).await
    }

    // Tier 3: Cross-field search (slow, rate-limited, result capped)
    #[allow(clippy::question_mark)]
    pub async fn find_by_custom_fields_cross(
        &self,
        tenant_id: Uuid,
        search: &str,
        limit: u64,
    ) -> Result<Vec<contact::Model>, &'static str> {
        self.rate_limiter.check_and_consume(tenant_id).await?;

        let sql = r#"
            SELECT *
            FROM collab_crm.contacts
            WHERE tenant_id = $1
            AND EXISTS (
                SELECT 1 FROM jsonb_each_text(custom_fields)
                WHERE value ILIKE $2
            )
            LIMIT $3
        "#;
        let rows = contact::Entity::find()
            .from_raw_sql(Statement::from_sql_and_values(
                DatabaseBackend::Postgres,
                sql,
                vec![
                    tenant_id.into(),
                    format!("%{}%", search).into(),
                    (limit as i64).into(),
                ],
            ))
            .all(&self.db)
            .await
            .map_err(|e| {
                warn!("Cross-field search failed: {}", e);
                "database error"
            })?;
        Ok(rows)
    }

    // Create contact
    pub async fn create_contact(
        &self,
        tenant_id: Uuid,
        name: &str,
        email: Option<&str>,
        phone: Option<&str>,
        custom_fields: JsonValue,
        now: chrono::DateTime<chrono::Utc>,
    ) -> Result<contact::Model, DbErr> {
        let id = Uuid::new_v4();
        let model = contact::ActiveModel {
            id: ActiveValue::Set(id),
            tenant_id: ActiveValue::Set(tenant_id),
            name: ActiveValue::Set(name.to_string()),
            email: ActiveValue::Set(email.map(|s| s.to_string())),
            phone: ActiveValue::Set(phone.map(|s| s.to_string())),
            custom_fields: ActiveValue::Set(custom_fields),
            lead_score: ActiveValue::Set(0),
            created_at: ActiveValue::Set(now),
            updated_at: ActiveValue::Set(now),
            version: ActiveValue::Set(0),
        };
        model.insert(&self.db).await
    }
}

impl Default for CrossFieldRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}
