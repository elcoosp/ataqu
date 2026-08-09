// allowed: pre-existing clippy warnings blocking TASK-078 build

use sea_orm_migration::prelude::*;

pub mod m20250101_000001_core;
pub mod m_aegis;
pub mod m_aegis_add_api_keys;
pub mod m_cinq;
pub mod m_cinq_add_activity_stage;
pub mod m_cinq_add_contact_unique;
pub mod m_cinq_add_contact_version;
pub mod m_cinq_add_deal_pipeline_stage;
pub mod m_cinq_add_lead_score;
pub mod m_cinq_add_tasks;
pub mod m_dial;
pub mod m_dial_add_message_columns;
pub mod m_dial_add_participants;
pub mod m_dial_add_presence;
pub mod m_dial_add_reactions;
pub mod m_dial_add_threads_mentions;
pub mod m_pause;
pub mod m_pause_add_columns;
pub mod m_pause_add_documents;
pub mod m_pause_rename_to_full_name;
pub mod m_pivot;
pub mod m_pivot_add_blocks_relations;
pub mod m_pivot_add_document_versions;
pub mod m_pivot_add_templates;
pub mod m_sond;
pub mod m_sond_add_schema;
pub mod m_spark;
pub mod m_tempo;
pub mod m_tempo_add_event_types;
pub mod m_tempo_add_reminder_tz;
pub mod m_tempo_add_slug;
pub mod m_tempo_add_status;
pub mod m_tempo_fix_duration;
pub mod m_vault;
pub mod m_vault_add_price_column;
pub mod m_vault_add_products_variants;
pub mod m_vault_add_reservations;
pub mod m_vault_add_stock_movements;
pub mod m_vault_add_warehouses;
pub mod m_vista_add_dashboards;
pub mod m_vista_tables;

// NEW STUBS

pub mod m20250101_000017_create_shopify_sync_logs;
pub mod m20250101_000018_create_user_preferences;

pub mod m20250101_000011_create_audit_and_permissions;
pub mod m20250101_000012_create_vista_views;

pub mod m20250101_000014_create_onboarding_and_changelog;
pub mod m20250101_000015_create_establishments;
pub mod m20250101_000016_create_workflow_runs;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250101_000001_core::Migration),
            Box::new(m_aegis::Migration),
            Box::new(m_aegis_add_api_keys::Migration),
            Box::new(m_cinq::Migration),
            Box::new(m_cinq_add_activity_stage::Migration),
            Box::new(m_cinq_add_deal_pipeline_stage::Migration),
            Box::new(m_cinq_add_tasks::Migration),
            Box::new(m_cinq_add_lead_score::Migration),
            Box::new(m_cinq_add_contact_unique::Migration),
            Box::new(m_cinq_add_contact_version::Migration),
            Box::new(m_dial::Migration),
            Box::new(m_dial_add_threads_mentions::Migration),
            Box::new(m_dial_add_message_columns::Migration),
            Box::new(m_dial_add_presence::Migration),
            Box::new(m_dial_add_participants::Migration),
            Box::new(m_dial_add_reactions::Migration),
            Box::new(m_pause::Migration),
            Box::new(m_pause_add_columns::Migration),
            Box::new(m_pause_rename_to_full_name::Migration),
            Box::new(m_pause_add_documents::Migration),
            Box::new(m_pivot::Migration),
            Box::new(m_pivot_add_document_versions::Migration),
            Box::new(m_pivot_add_blocks_relations::Migration),
            Box::new(m_pivot_add_templates::Migration),
            Box::new(m_sond::Migration),
            Box::new(m_sond_add_schema::Migration),
            Box::new(m_spark::Migration),
            Box::new(m_tempo::Migration),
            Box::new(m_tempo_add_status::Migration),
            Box::new(m_tempo_fix_duration::Migration),
            Box::new(m_tempo_add_event_types::Migration),
            Box::new(m_tempo_add_reminder_tz::Migration),
            Box::new(m_tempo_add_slug::Migration),
            Box::new(m_vault::Migration),
            Box::new(m_vault_add_products_variants::Migration),
            Box::new(m_vault_add_price_column::Migration),
            Box::new(m_vault_add_stock_movements::Migration),
            Box::new(m_vault_add_reservations::Migration),
            Box::new(m_vault_add_warehouses::Migration),
            Box::new(m_vista_tables::Migration),
            Box::new(m_vista_add_dashboards::Migration),
            // NEW MIGRATIONS
            Box::new(m20250101_000011_create_audit_and_permissions::Migration),
            Box::new(m20250101_000012_create_vista_views::Migration),
            Box::new(m20250101_000013_create_shopify_integrations::Migration),
            Box::new(m20250101_000014_create_onboarding_and_changelog::Migration),
            Box::new(m20250101_000015_create_establishments::Migration),
            Box::new(m20250101_000016_create_workflow_runs::Migration),
        
            Box::new(m20250101_000017_create_shopify_sync_logs::Migration),
            Box::new(m20250101_000018_create_user_preferences::Migration),
]
    }
}

pub mod m20250101_000013_create_shopify_integrations;
