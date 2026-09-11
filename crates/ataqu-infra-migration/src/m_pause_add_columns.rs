use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        // Add columns to employees
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employee
            ADD COLUMN IF NOT EXISTS phone TEXT,
            ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT 'Employee',
            ADD COLUMN IF NOT EXISTS department TEXT,
            ADD COLUMN IF NOT EXISTS hire_date DATE,
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            "#,
        )
        .await?;

        // Add columns to leave_requests
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.leave_request
            ADD COLUMN IF NOT EXISTS leave_type TEXT NOT NULL DEFAULT 'annual',
            ADD COLUMN IF NOT EXISTS reason TEXT,
            ADD COLUMN IF NOT EXISTS reviewer_id UUID,
            ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employee
            DROP COLUMN IF EXISTS phone,
            DROP COLUMN IF EXISTS job_title,
            DROP COLUMN IF EXISTS department,
            DROP COLUMN IF EXISTS hire_date,
            DROP COLUMN IF EXISTS is_active,
            DROP COLUMN IF EXISTS updated_at;
            "#,
        )
        .await?;
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.leave_request
            DROP COLUMN IF EXISTS leave_type,
            DROP COLUMN IF EXISTS reason,
            DROP COLUMN IF EXISTS reviewer_id,
            DROP COLUMN IF EXISTS reviewed_at,
            DROP COLUMN IF EXISTS updated_at;
            "#,
        )
        .await?;
        Ok(())
    }
}
