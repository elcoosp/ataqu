use async_trait::async_trait;
use ataqu_domain_vault::shopify::{ShopifyIntegration, ShopifyRepository};
use ataqu_kernel::TenantId;
use chrono::Utc;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use uuid::Uuid;

pub struct ShopifyRepositoryImpl {
    db: DatabaseConnection,
}

impl ShopifyRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ShopifyRepository for ShopifyRepositoryImpl {
    async fn list_active_integrations(&self) -> Result<Vec<ShopifyIntegration>, String> {
        let sql = "SELECT id, tenant_id, shop_domain, access_token, last_synced_at, created_at FROM vault.shopify_integrations WHERE status = 'active'";
        let res = self
            .db
            .query_all_raw(Statement::from_sql_and_values(
                sea_orm::DbBackend::Postgres,
                sql,
                vec![],
            ))
            .await
            .map_err(|e| e.to_string())?;

        let mut ints = Vec::new();
        for row in res {
            let id: Uuid = row.try_get("", "id").map_err(|e| e.to_string())?;
            let tenant_id: Uuid = row.try_get("", "tenant_id").map_err(|e| e.to_string())?;
            let shop_domain: String = row.try_get("", "shop_domain").map_err(|e| e.to_string())?;
            let access_token: String =
                row.try_get("", "access_token").map_err(|e| e.to_string())?;
            let last_synced_at: Option<chrono::DateTime<chrono::Utc>> = row
                .try_get("", "last_synced_at")
                .map_err(|e| e.to_string())?;
            let created_at: chrono::DateTime<chrono::Utc> =
                row.try_get("", "created_at").map_err(|e| e.to_string())?;

            ints.push(ShopifyIntegration {
                id,
                tenant_id: TenantId::new(tenant_id),
                shop_domain,
                access_token,
                last_synced_at,
                created_at,
            });
        }
        Ok(ints)
    }

    async fn update_last_synced(
        &self,
        integration_id: Uuid,
        synced_at: chrono::DateTime<Utc>,
    ) -> Result<(), String> {
        let sql = "UPDATE vault.shopify_integrations SET last_synced_at = $1 WHERE id = $2";
        self.db
            .execute_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                sql,
                vec![synced_at.into(), integration_id.into()],
            ))
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
