//! Repository for user preferences.
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use uuid::Uuid;

mod user_preferences_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use serde_json::Value;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "user_preferences", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub user_id: Uuid,
        pub last_read_changelog_at: Option<DateTime<Utc>>,
        pub preferences: Value,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}
    impl ActiveModelBehavior for ActiveModel {}
}

pub struct UserPreferencesRepository {
    db: DatabaseConnection,
}

impl UserPreferencesRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_last_read_changelog(
        &self,
        user_id: Uuid,
    ) -> Result<Option<chrono::DateTime<chrono::Utc>>, String> {
        use user_preferences_entity as entity;
        let model = entity::Entity::find()
            .filter(entity::Column::UserId.eq(user_id))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(model.and_then(|m| m.last_read_changelog_at))
    }

    pub async fn update_last_read_changelog(
        &self,
        user_id: Uuid,
        time: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), String> {
        use user_preferences_entity as entity;
        use sea_orm::{ActiveModelTrait, Set};
        let existing = entity::Entity::find()
            .filter(entity::Column::UserId.eq(user_id))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        if let Some(model) = existing {
            let mut active: entity::ActiveModel = model.into();
            active.last_read_changelog_at = Set(Some(time));
            active.updated_at = Set(time);
            active.update(&self.db).await.map_err(|e| e.to_string())?;
        } else {
            let active = entity::ActiveModel {
                user_id: Set(user_id),
                last_read_changelog_at: Set(Some(time)),
                preferences: Set(serde_json::json!({})),
                updated_at: Set(time),
            };
            entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
