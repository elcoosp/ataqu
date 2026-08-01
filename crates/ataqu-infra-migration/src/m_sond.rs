use sea_orm::{DbBackend, Statement};
use sea_orm_migration::async_trait::async_trait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"CREATE SCHEMA IF NOT EXISTS collab_ops"#,
            [],
        ))
        .await?;

        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Alias::new("forms")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("title")).text().not_null())
                    .col(ColumnDef::new(Alias::new("description")).text().null())
                    .col(
                        ColumnDef::new(Alias::new("schema_json"))
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("is_active"))
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"CREATE INDEX IF NOT EXISTS idx_forms_tenant ON collab_ops.forms (tenant_id)"#,
            [],
        ))
        .await?;

        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Alias::new("submissions")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("form_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("respondent_id")).uuid().null())
                    .col(
                        ColumnDef::new(Alias::new("response_data"))
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("submitted_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"ALTER TABLE collab_ops.submissions ADD CONSTRAINT fk_submissions_form FOREIGN KEY (form_id) REFERENCES collab_ops.forms(id) ON DELETE CASCADE"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON collab_ops.submissions (tenant_id)"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"CREATE INDEX IF NOT EXISTS idx_submissions_form ON collab_ops.submissions (form_id)"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"ALTER TABLE collab_ops.forms ENABLE ROW LEVEL SECURITY"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"ALTER TABLE collab_ops.submissions ENABLE ROW LEVEL SECURITY"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forms' AND schemaname = 'collab_ops' AND policyname = 'ops_forms_isolation') THEN CREATE POLICY ops_forms_isolation ON collab_ops.forms TO ops_role USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid); END IF; END $$"#,
            [],
        ))
        .await?;

        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND schemaname = 'collab_ops' AND policyname = 'ops_submissions_isolation') THEN CREATE POLICY ops_submissions_isolation ON collab_ops.submissions TO ops_role USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid); END IF; END $$"#,
            [],
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"DROP TABLE IF EXISTS collab_ops.submissions CASCADE"#,
            [],
        ))
        .await?;
        db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"DROP TABLE IF EXISTS collab_ops.forms CASCADE"#,
            [],
        ))
        .await?;
        Ok(())
    }
}
