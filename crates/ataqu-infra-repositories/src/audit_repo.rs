use async_trait::async_trait;
use chrono::{DateTime, Datelike, Timelike, Utc};
use sea_orm::DatabaseConnection;
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use std::collections::HashMap;
use std::net::IpAddr;
use uuid::Uuid;

use ataqu_domain_aegis::repository::{AuditLogEntry, AuditRepositoryTrait, PermissionEntry};
use ataqu_kernel::TenantId;

pub struct AuditRepository {
    pool: PgPool,
}

impl AuditRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            pool: db.get_postgres_connection_pool().clone(),
        }
    }

    
    async fn partition_exists(&self, date: DateTime<Utc>) -> bool {
        let year = date.format("%Y").to_string();
        let month = date.format("%m").to_string();
        let partition_name = format!("core.audit_logs_{}_{}", year, month);
        let result = sqlx::query_scalar::<_, i32>(
            "SELECT 1 FROM pg_tables WHERE schemaname = 'core' AND tablename = $1",
        )
        .bind(partition_name)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()
        .is_some();
        result
    }

    async fn create_partition(&self, date: DateTime<Utc>) -> Result<(), String> {
        let year = date.format("%Y").to_string();
        let month = date.format("%m").to_string();
        let partition_name = format!("core.audit_logs_{}_{}", year, month);
        let start = date
            .with_day(1)
            .and_then(|d| {
                d.with_hour(0)
                    .and_then(|d| d.with_minute(0).and_then(|d| d.with_second(0)))
            })
            .ok_or("Failed to create start date")?;
        let end = start
            .checked_add_months(chrono::Months::new(1))
            .ok_or("Failed to add month")?;

        let mut query_builder = sqlx::QueryBuilder::new("CREATE TABLE IF NOT EXISTS ");
        query_builder.push(&partition_name);
        query_builder.push(" PARTITION OF core.audit_logs FOR VALUES FROM (");
        query_builder.push_bind(start.to_rfc3339());
        query_builder.push(") TO (");
        query_builder.push_bind(end.to_rfc3339());
        query_builder.push(");");

        let query = query_builder.build();
        query
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create partition: {}", e))?;
        Ok(())
    }
}

#[async_trait]
impl AuditRepositoryTrait for AuditRepository {
    async fn append_log(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
        action: &str,
        app: &str,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        old_value: Option<JsonValue>,
        new_value: Option<JsonValue>,
        ip_address: Option<IpAddr>,
        user_agent: Option<&str>,
    ) -> Result<(), String> {
        let now = Utc::now();
        if !self.partition_exists(now).await {
            self.create_partition(now).await?;
        }

        let sql = r#"
            INSERT INTO core.audit_logs (
                tenant_id, user_id, action, app, entity_type, entity_id,
                old_value, new_value, ip_address, user_agent, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#;
        sqlx::query(sql)
            .bind(tenant_id.as_uuid())
            .bind(user_id)
            .bind(action)
            .bind(app)
            .bind(entity_type)
            .bind(entity_id)
            .bind(old_value)
            .bind(new_value)
            .bind(ip_address.map(|ip| ip.to_string()))
            .bind(user_agent)
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_logs(
        &self,
        tenant_id: TenantId,
        limit: i64,
        offset: i64,
        action_filter: Option<&str>,
        app_filter: Option<&str>,
        from_date: Option<DateTime<Utc>>,
        to_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<AuditLogEntry>, String> {
        let sql = r#"
            SELECT id, tenant_id, user_id, action, app, entity_type, entity_id,
                   old_value, new_value, ip_address, user_agent, created_at
            FROM core.audit_logs
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR action = $2)
              AND ($3::text IS NULL OR app = $3)
              AND ($4::timestamptz IS NULL OR created_at >= $4)
              AND ($5::timestamptz IS NULL OR created_at <= $5)
            ORDER BY created_at DESC
            LIMIT $6 OFFSET $7
        "#;
        let rows = sqlx::query_as::<
            _,
            (
                i64,
                Uuid,
                Uuid,
                String,
                String,
                Option<String>,
                Option<Uuid>,
                Option<JsonValue>,
                Option<JsonValue>,
                Option<String>,
                Option<String>,
                DateTime<Utc>,
            ),
        >(sql)
        .bind(tenant_id.as_uuid())
        .bind(action_filter)
        .bind(app_filter)
        .bind(from_date)
        .bind(to_date)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut entries = Vec::new();
        for row in rows {
            let entry = AuditLogEntry {
                id: row.0,
                tenant_id: TenantId::new(row.1),
                user_id: row.2,
                action: row.3,
                app: row.4,
                entity_type: row.5,
                entity_id: row.6,
                old_value: row.7,
                new_value: row.8,
                ip_address: row.9.and_then(|s| s.parse().ok()),
                user_agent: row.10,
                created_at: row.11,
            };
            entries.push(entry);
        }
        Ok(entries)
    }

    async fn get_permission_matrix(
        &self,
        tenant_id: TenantId,
    ) -> Result<Vec<PermissionEntry>, String> {
        let sql = r#"
            SELECT
                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,
                p.app,
                p.role
            FROM core.users u
            LEFT JOIN core.permissions p ON u.id = p.user_id AND p.tenant_id = u.tenant_id
            WHERE u.tenant_id = $1
        "#;
        let rows = sqlx::query_as::<
            _,
            (Uuid, Option<String>, String, Option<String>, Option<String>),
        >(sql)
        .bind(tenant_id.as_uuid())
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut user_map: HashMap<Uuid, PermissionEntry> = HashMap::new();
        for (user_id, user_name, user_email, app, role) in rows {
            let entry = user_map.entry(user_id).or_insert_with(|| PermissionEntry {
                user_id,
                user_name: user_name.clone(),
                user_email: user_email.clone(),
                role_per_app: HashMap::new(),
            });
            if let (Some(app), Some(role)) = (app, role) {
                entry.role_per_app.insert(app, role);
            }
        }
        Ok(user_map.into_values().collect())
    }
}
