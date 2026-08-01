use sea_orm::{
    ActiveValue::Set,
    DatabaseConnection, DbErr, QueryOrder, QuerySelect,
    entity::prelude::*,
    sea_query::{Expr, Order},
};
use serde_json::Value as JsonValue;
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

pub struct PivotRepository {
    db: DatabaseConnection,
}

impl PivotRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // ---- Documents ----

    pub async fn create_document(
        &self,
        id: Uuid,
        tenant_id: Uuid,
        title: String,
        content: Option<String>,
        metadata: Option<JsonValue>,
    ) -> Result<document::Model, DbErr> {
        let now = chrono::Utc::now();
        document::ActiveModel {
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
        .await
    }

    pub async fn get_document(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<document::Model>, DbErr> {
        document::Entity::find()
            .filter(document::COLUMN.id.eq(id))
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .one(&self.db)
            .await
    }

    pub async fn list_documents(
        &self,
        tenant_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<document::Model>, DbErr> {
        document::Entity::find()
            .filter(document::COLUMN.tenant_id.eq(tenant_id))
            .order_by_desc(document::COLUMN.created_at)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
    }

    pub async fn search_documents(
        &self,
        tenant_id: Uuid,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> Result<(Vec<document::Model>, i64), DbErr> {
        if query.trim().is_empty() {
            return Ok((Vec::new(), 0));
        }
        let tsquery = format!("{}:*", query.trim().replace(' ', " & "));

        // Build condition with parameterized tsquery
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

    pub async fn create_database(
        &self,
        id: Uuid,
        tenant_id: Uuid,
        name: String,
        connection_string: String,
        metadata: Option<JsonValue>,
    ) -> Result<database::Model, DbErr> {
        let now = chrono::Utc::now();
        database::ActiveModel {
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
        .await
    }

    pub async fn get_database(
        &self,
        id: Uuid,
        tenant_id: Uuid,
    ) -> Result<Option<database::Model>, DbErr> {
        database::Entity::find()
            .filter(database::COLUMN.id.eq(id))
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .one(&self.db)
            .await
    }

    pub async fn list_databases(
        &self,
        tenant_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<database::Model>, DbErr> {
        database::Entity::find()
            .filter(database::COLUMN.tenant_id.eq(tenant_id))
            .order_by_desc(database::COLUMN.created_at)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
    }

    pub async fn search_databases(
        &self,
        tenant_id: Uuid,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> Result<(Vec<database::Model>, i64), DbErr> {
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
    use sea_orm::{Database, DbErr};
    use serial_test::serial;

    async fn setup_test_db() -> DatabaseConnection {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres@localhost:5432/ataqu_test".to_string()
        });
        Database::connect(&db_url)
            .await
            .expect("Failed to connect to test DB")
    }

    #[tokio::test]
    #[serial]
    async fn test_document_crud() -> Result<(), DbErr> {
        let db = setup_test_db().await;
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
    async fn test_database_crud() -> Result<(), DbErr> {
        let db = setup_test_db().await;
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
