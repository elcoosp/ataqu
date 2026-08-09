use crate::cinq_contact_repo::CrossFieldRateLimiter;
use crate::entities::deal;
use crate::entities::deal::Entity as DealEntity;
use rust_decimal::Decimal;
use sea_orm::sea_query::Expr;
use sea_orm::*;
use serde_json::{Value as JsonValue, json};
use tracing::warn;
use uuid::Uuid;

pub struct DealRepository {
    db: DatabaseConnection,
    rate_limiter: CrossFieldRateLimiter,
}

impl DealRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            rate_limiter: CrossFieldRateLimiter::new(),
        }
    }

    // Tier 1: Exact match
    pub async fn find_by_custom_field_exact(
        &self,
        tenant_id: Uuid,
        field: &str,
        value: &JsonValue,
    ) -> Result<Vec<deal::Model>, DbErr> {
        let obj = json!({ field: value });
        let cond = Condition::all()
            .add(deal::Column::TenantId.eq(tenant_id))
            .add(Expr::cust_with_values(
                "custom_fields @> $1",
                vec![obj.into()] as Vec<sea_orm::Value>,
            ));
        DealEntity::find().filter(cond).all(&self.db).await
    }

    // Tier 2: Single-field text
    pub async fn find_by_custom_field_text(
        &self,
        tenant_id: Uuid,
        field: &str,
        search: &str,
    ) -> Result<Vec<deal::Model>, DbErr> {
        let pattern = format!("%{}%", search);
        let cond = Condition::all()
            .add(deal::Column::TenantId.eq(tenant_id))
            .add(Expr::cust_with_values(
                "custom_fields ->> $1 ILIKE $2",
                vec![field.into(), pattern.into()] as Vec<sea_orm::Value>,
            ));
        DealEntity::find().filter(cond).all(&self.db).await
    }

    // Tier 3: Cross-field (rate-limited, result capped)
    pub async fn find_by_custom_fields_cross(
        &self,
        tenant_id: Uuid,
        search: &str,
        limit: u64,
    ) -> Result<Vec<deal::Model>, &'static str> {
        self.rate_limiter.check_and_consume(tenant_id).await?;
        let sql = r#"
            SELECT *
            FROM collab_crm.deals
            WHERE tenant_id = $1
            AND EXISTS (
                SELECT 1 FROM jsonb_each_text(custom_fields)
                WHERE value ILIKE $2
            )
            LIMIT $3
        "#;
        let rows = deal::Entity::find()
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
                warn!("Cross-field search for deals failed: {}", e);
                "database error"
            })?;
        Ok(rows)
    }

    // Create deal

    #[allow(clippy::too_many_arguments)]
    pub async fn create_deal(
        &self,
        tenant_id: Uuid,
        contact_id: Uuid,
        title: &str,
        amount: Decimal,
        status: &str,
        custom_fields: JsonValue,
        now: chrono::DateTime<chrono::Utc>,
    ) -> Result<deal::Model, DbErr> {
        let _ = now;
        let id = Uuid::new_v4();
        let model = deal::ActiveModel {
            id: ActiveValue::Set(id),
            tenant_id: ActiveValue::Set(tenant_id),
            contact_id: ActiveValue::Set(contact_id),
            title: ActiveValue::Set(title.to_string()),
            amount: ActiveValue::Set(amount),
            status: ActiveValue::Set(status.to_string()),
            pipeline_stage_id: ActiveValue::Set(Uuid::nil()),
            custom_fields: ActiveValue::Set(custom_fields),
            created_at: ActiveValue::Set(now),
            updated_at: ActiveValue::Set(now),
        };
        model.insert(&self.db).await
    }
}
