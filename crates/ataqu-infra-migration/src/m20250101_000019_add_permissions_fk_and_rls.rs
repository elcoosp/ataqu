use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add foreign key from core.permissions.user_id to core.users.id
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_permissions_user'
                ) THEN
                    ALTER TABLE core.permissions
                    ADD CONSTRAINT fk_permissions_user
                    FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE;
                END IF;
            END $$;
            "#,
        )
        .await?;

        // Enable RLS on core.outbox if not already enabled
        db.execute_unprepared(
            r#"
            ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;
            "#,
        )
        .await?;

        // Create RLS policies if they don't exist
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

        // Grant sequence usage
        db.execute_unprepared(
            r#"
            GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq
            TO core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;
            "#,
        )
        .await?;

        // Grant column-level UPDATE privileges to dispatcher_role
        db.execute_unprepared(
            r#"
            GRANT SELECT ON core.outbox TO dispatcher_role;
            GRANT UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at)
            ON core.outbox TO dispatcher_role;
            "#,
        )
        .await?;

        // Create dispatcher SELECT policy
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

        // Create dispatcher UPDATE policy
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
        db.execute_unprepared(
            "ALTER TABLE core.permissions DROP CONSTRAINT IF EXISTS fk_permissions_user;",
        )
        .await?;
        Ok(())
    }
}
