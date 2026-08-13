use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 1. Ensure the core.permissions table exists
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.permissions (
                id BIGSERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                user_id UUID NOT NULL,
                app TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
        )
        .await?;

        // 2. Add foreign key if not exists
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_permissions_user'
                    AND table_schema = 'core' AND table_name = 'permissions'
                ) THEN
                    ALTER TABLE core.permissions
                    ADD CONSTRAINT fk_permissions_user
                    FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE;
                END IF;
            END $$;
            "#,
        )
        .await?;

        // 3. Create required roles if they don't exist
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'core_role') THEN
                    CREATE ROLE core_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cinq_role') THEN
                    CREATE ROLE cinq_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_role') THEN
                    CREATE ROLE ops_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vault_role') THEN
                    CREATE ROLE vault_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dial_role') THEN
                    CREATE ROLE dial_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vista_role') THEN
                    CREATE ROLE vista_role NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dispatcher_role') THEN
                    CREATE ROLE dispatcher_role NOLOGIN;
                END IF;
            END $$;
            "#,
        )
        .await?;

        // 4. Enable RLS on core.outbox
        db.execute_unprepared(
            r#"
            ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;
            "#,
        )
        .await?;

        // 5. Create RLS policies if they don't exist
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_core_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_core_insert ON core.outbox
                    FOR INSERT TO core_role
                    WITH CHECK (schema = 'core');
                END IF;
            END $$;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_cinq_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_cinq_insert ON core.outbox
                    FOR INSERT TO cinq_role
                    WITH CHECK (schema = 'collab_crm');
                END IF;
            END $$;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_ops_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_ops_insert ON core.outbox
                    FOR INSERT TO ops_role
                    WITH CHECK (schema = 'collab_ops');
                END IF;
            END $$;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_vault_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_vault_insert ON core.outbox
                    FOR INSERT TO vault_role
                    WITH CHECK (schema = 'vault');
                END IF;
            END $$;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_dial_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_dial_insert ON core.outbox
                    FOR INSERT TO dial_role
                    WITH CHECK (schema = 'dial');
                END IF;
            END $$;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_vista_insert'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_vista_insert ON core.outbox
                    FOR INSERT TO vista_role
                    WITH CHECK (schema = 'vista');
                END IF;
            END $$;
            "#,
        )
        .await?;

        // 6. Grant sequence usage
        db.execute_unprepared(
            r#"
            GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq
            TO core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;
            "#,
        )
        .await?;

        // 7. Grant column-level UPDATE privileges to dispatcher_role
        db.execute_unprepared(
            r#"
            GRANT SELECT ON core.outbox TO dispatcher_role;
            GRANT UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at)
            ON core.outbox TO dispatcher_role;
            "#,
        )
        .await?;

        // 8. Create dispatcher SELECT policy
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_dispatcher_select'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_dispatcher_select ON core.outbox
                    FOR SELECT TO dispatcher_role
                    USING (true);
                END IF;
            END $$;
            "#,
        )
        .await?;

        // 9. Create dispatcher UPDATE policy
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE policyname = 'outbox_dispatcher_update'
                    AND tablename = 'outbox'
                    AND schemaname = 'core'
                ) THEN
                    CREATE POLICY outbox_dispatcher_update ON core.outbox
                    FOR UPDATE TO dispatcher_role
                    USING (true);
                END IF;
            END $$;
            "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Drop policies
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_dispatcher_update ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_dispatcher_select ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_vista_insert ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_dial_insert ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_vault_insert ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_ops_insert ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_cinq_insert ON core.outbox;")
            .await?;
        db.execute_unprepared("DROP POLICY IF EXISTS outbox_core_insert ON core.outbox;")
            .await?;

        // Drop foreign key
        db.execute_unprepared(
            "ALTER TABLE core.permissions DROP CONSTRAINT IF EXISTS fk_permissions_user;",
        )
        .await?;

        // Drop table
        db.execute_unprepared("DROP TABLE IF EXISTS core.permissions CASCADE;")
            .await?;

        // Optionally drop roles (but they might be used elsewhere, so skip in down)
        // We'll leave them.

        Ok(())
    }
}
