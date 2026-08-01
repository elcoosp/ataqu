use sea_orm::{
    ActiveValue::Set,
    DatabaseConnection, DbErr, QueryOrder, QuerySelect,
    entity::prelude::*,
    sea_query::{Expr, Order},
};
use serde_json::Value as JsonValue;
use thiserror::Error;
use tracing::instrument;
use uuid::Uuid;

mod document {
    use sea_orm::entity::prelude::*;
    use serde_json::Value as JsonValue;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "documents", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub title: String,
        pub content: Option<String>,
        pub metadata: Option<JsonValue>,
        pub search_vector: String,
        pub created_at: chrono::DateTime<chrono::Utc>,
        pub updated_at: chrono::DateTime<chrono::Utc>,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

mod database {
    use sea_orm::entity::prelude::*;
    use serde_json::Value as JsonValue;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "databases", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub connection_string: String,
        pub metadata: Option<JsonValue>,
        pub search_vector: String,
        pub created_at: chrono::DateTime<chrono::Utc>,
        pub updated_at: chrono::DateTime<chrono::Utc>,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

#[derive(Error, Debug)]
pub enum PivotError {
    #[error("Database error: {0}")]
    Database(#[from] DbErr),
    #[error("Invalid search query")]
    InvalidQuery,
    #[error("Tenant mismatch")]
    TenantMismatch,
}

pub type PivotResult<T> = Result<T, PivotError>;

pub struct PivotRepository {
    db: DatabaseConnection,
}

impl PivotRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // ---- Documents ----

    #[instrument(skip(self))]
    pub async fn create_document(
        &self,
        id: Uuid,
        tenant_id: Uuid,
        title: String,
        content: Option<String>,
        metadata: Option<JsonValue>,
    ) -> PivotResult<document::Model> {
        let now = chrono::Utc::now();
        let doc = document::ActiveModel {
            id: Set(id),
            tenant_id: Set(tenant_id),
            title: Set(title),
            content: Set(content),
            metadata: Set(metadata),
            search_vector: Set("".to_string()),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&self.db)
        .await?;
        Ok(doc)
    }

    #[instrument(skip(self))]
    pub async fn get_document(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> PivotResult<Option<document::Model>> {
        let doc = document::Entity::find()
            .filter(document::COLUMN.id.eq(id))
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .one(&self.db)
            .await?;
        Ok(doc)
    }

    #[instrument(skip(self))]
    pub async fn list_documents(
        &self,
        tenant_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> PivotResult<Vec<document::Model>> {
        let docs = document::Entity::find()
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .order_by_desc(document::COLUMN.created_at)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await?;
        Ok(docs)
    }

    #[instrument(skip(self))]
    pub async fn search_documents(
        &self,
        tenant_id: Uuid,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> PivotResult<(Vec<document::Model>, i64)> {
        if query.trim().is_empty() {
            return Ok((Vec::new(), 0));
        }
        let tsquery = format!("{}:*", query.trim().replace(' ', " & "));

        let condition = Expr::cust_with_values(
            "search_vector @@ to_tsquery('english', $1)",
            [tsquery.clone()],
        );
        let rank_expr = Expr::cust_with_values(
            "ts_rank(search_vector, to_tsquery('english', $1))",
            [tsquery.clone()],
        );

        let docs = document::Entity::find()
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .filter(condition)
            .order_by(rank_expr, Order::Desc)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await?;

        let total = document::Entity::find()
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .filter(Expr::cust_with_values(
                "search_vector @@ to_tsquery('english', $1)",
                [tsquery],
            ))
            .count(&self.db)
            .await?;

        Ok((docs, total as i64))
    }

    // ---- Databases ----

    #[instrument(skip(self))]
    pub async fn create_database(
        &self,
        id: Uuid,
        tenant_id: Uuid,
        name: String,
        connection_string: String,
        metadata: Option<JsonValue>,
    ) -> PivotResult<database::Model> {
        let now = chrono::Utc::now();
        let db_model = database::ActiveModel {
            id: Set(id),
            tenant_id: Set(tenant_id),
            name: Set(name),
            connection_string: Set(connection_string),
            metadata: Set(metadata),
            search_vector: Set("".to_string()),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(&self.db)
        .await?;
        Ok(db_model)
    }

    #[instrument(skip(self))]
    pub async fn get_database(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> PivotResult<Option<database::Model>> {
        let db_model = database::Entity::find()
            .filter(database::COLUMN.id.eq(id))
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .one(&self.db)
            .await?;
        Ok(db_model)
    }

    #[instrument(skip(self))]
    pub async fn list_databases(
        &self,
        tenant_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> PivotResult<Vec<database::Model>> {
        let dbs = database::Entity::find()
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .order_by_desc(database::COLUMN.created_at)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await?;
        Ok(dbs)
    }

    #[instrument(skip(self))]
    pub async fn search_databases(
        &self,
        tenant_id: Uuid,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> PivotResult<(Vec<database::Model>, i64)> {
        if query.trim().is_empty() {
            return Ok((Vec::new(), 0));
        }
        let tsquery = format!("{}:*", query.trim().replace(' ', " & "));

        let condition = Expr::cust_with_values(
            "search_vector @@ to_tsquery('english', $1)",
            [tsquery.clone()],
        );
        let rank_expr = Expr::cust_with_values(
            "ts_rank(search_vector, to_tsquery('english', $1))",
            [tsquery.clone()],
        );

        let dbs = database::Entity::find()
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .filter(condition)
            .order_by(rank_expr, Order::Desc)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await?;

        let total = database::Entity::find()
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .filter(Expr::cust_with_values(
                "search_vector @@ to_tsquery('english', $1)",
                [tsquery],
            ))
            .count(&self.db)
            .await?;

        Ok((dbs, total as i64))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::Database;
    use serial_test::serial;

    async fn setup_test_db() -> Option<DatabaseConnection> {
        let db_url = match std::env::var("DATABASE_URL") {
            Ok(url) => url,
            Err(_) => {
                eprintln!("Skipping DB tests: DATABASE_URL not set");
                return None;
            }
        };
        match Database::connect(&db_url).await {
            Ok(conn) => Some(conn),
            Err(e) => {
                eprintln!("Skipping DB tests: failed to connect: {}", e);
                None
            }
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_document_crud() -> Result<(), Box<dyn std::error::Error>> {
        let db = match setup_test_db().await {
            Some(db) => db,
            None => return Ok(()),
        };
        let repo = PivotRepository::new(db);
        let tenant = Uuid::new_v4();
        let id = Uuid::new_v4();
        let doc = repo
            .create_document(
                id,
                tenant,
                "Test Doc".to_string(),
                Some("Content".to_string()),
                None,
            )
            .await?;
        assert_eq!(doc.id, id);
        let fetched = repo.get_document(id, tenant).await?.unwrap();
        assert_eq!(fetched.id, id);
        let list = repo.list_documents(tenant, 10, 0).await?;
        assert_eq!(list.len(), 1);
        let (results, total) = repo.search_documents(tenant, "Test", 10, 0).await?;
        assert_eq!(total, 1);
        assert_eq!(results[0].id, id);
        Ok(())
    }

    #[tokio::test]
    #[serial]
    async fn test_database_crud() -> Result<(), Box<dyn std::error::Error>> {
        let db = match setup_test_db().await {
            Some(db) => db,
            None => return Ok(()),
        };
        let repo = PivotRepository::new(db);
        let tenant = Uuid::new_v4();
        let id = Uuid::new_v4();
        let db_model = repo
            .create_database(
                id,
                tenant,
                "TestDB".to_string(),
                "postgres://user:pass@host/db".to_string(),
                None,
            )
            .await?;
        assert_eq!(db_model.id, id);
        let fetched = repo.get_database(id, tenant).await?.unwrap();
        assert_eq!(fetched.id, id);
        let list = repo.list_databases(tenant, 10, 0).await?;
        assert_eq!(list.len(), 1);
        let (results, total) = repo.search_databases(tenant, "TestDB", 10, 0).await?;
        assert_eq!(total, 1);
        assert_eq!(results[0].id, id);
        Ok(())
    }
}
