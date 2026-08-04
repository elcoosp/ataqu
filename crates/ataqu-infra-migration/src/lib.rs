use sea_orm_migration::prelude::*;

pub mod m20250101_000001_core;
pub mod m_aegis;
pub mod m_cinq;
pub mod m_cinq_add_activity_stage;
pub mod m_cinq_add_deal_pipeline_stage;
pub mod m_dial;
pub mod m_dial_add_message_columns;
pub mod m_dial_add_participants;
pub mod m_dial_add_presence;
pub mod m_dial_add_threads_mentions;
pub mod m_pause;
pub mod m_pause_add_columns;
pub mod m_pause_add_documents;
pub mod m_pause_rename_to_full_name;
pub mod m_pivot;
pub mod m_pivot_add_blocks_relations;
pub mod m_sond;
pub mod m_spark;
pub mod m_tempo;
pub mod m_tempo_add_event_types;
pub mod m_tempo_add_status;
pub mod m_tempo_fix_duration;
pub mod m_vault;
pub mod m_vault_add_price_column;
pub mod m_vault_add_products_variants;
pub mod m_vault_add_stock_movements;
pub mod m_vista_tables;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250101_000001_core::Migration),
            Box::new(m_aegis::Migration),
            Box::new(m_cinq::Migration),
            Box::new(m_cinq_add_activity_stage::Migration),
            Box::new(m_cinq_add_deal_pipeline_stage::Migration),
            Box::new(m_dial::Migration),
            Box::new(m_dial_add_threads_mentions::Migration),
            Box::new(m_dial_add_message_columns::Migration),
            Box::new(m_dial_add_presence::Migration),
            Box::new(m_dial_add_participants::Migration),
            Box::new(m_pause::Migration),
            Box::new(m_pause_add_columns::Migration),
            Box::new(m_pause_rename_to_full_name::Migration),
            Box::new(m_pause_add_documents::Migration),
            Box::new(m_pivot::Migration),
            Box::new(m_pivot_add_blocks_relations::Migration),
            Box::new(m_sond::Migration),
            Box::new(m_spark::Migration),
            Box::new(m_tempo::Migration),
            Box::new(m_tempo_add_status::Migration),
            Box::new(m_tempo_fix_duration::Migration),
            Box::new(m_tempo_add_event_types::Migration),
            Box::new(m_vault::Migration),
            Box::new(m_vault_add_products_variants::Migration),
            Box::new(m_vault_add_price_column::Migration),
            Box::new(m_vault_add_stock_movements::Migration),
            Box::new(m_vista_tables::Migration),
        ]
    }
}
