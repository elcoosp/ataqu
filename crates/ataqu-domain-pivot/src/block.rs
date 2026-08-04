use serde::{Serialize, Deserialize};
use crate::primitives::{Clock, IdGenerator, TenantId, Uuid};
use std::time::SystemTime;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockType {
    Markdown(String),
    Table {
        columns: Vec<String>,
        rows: Vec<Vec<String>>,
    },
    View {
        filter: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Relation {
    pub from_block_id: Uuid,
    pub to_block_id: Uuid,
    pub relation_type: String,
}

#[derive(Debug, Clone)]
pub struct CreateBlockCommand {
    pub tenant_id: TenantId,
    pub document_id: Uuid,
    pub block_type: BlockType,
}

#[derive(Debug, Clone)]
pub struct BlockCreatedEvent {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub document_id: Uuid,
    pub block_type: BlockType,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CreateRelationCommand {
    pub tenant_id: TenantId,
    pub relation: Relation,
}

#[derive(Debug, Clone)]
pub struct RelationCreatedEvent {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub relation: Relation,
    pub created_at: SystemTime,
}

pub fn create_block(
    cmd: CreateBlockCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> BlockCreatedEvent {
    BlockCreatedEvent {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        document_id: cmd.document_id,
        block_type: cmd.block_type,
        created_at: clock.now(),
    }
}

pub fn create_relation(
    cmd: CreateRelationCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> RelationCreatedEvent {
    RelationCreatedEvent {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        relation: cmd.relation,
        created_at: clock.now(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    struct MockIdGen;
    impl IdGenerator for MockIdGen {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::nil()
        }
    }

    struct MockClock;
    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            SystemTime::UNIX_EPOCH + Duration::from_secs(2000)
        }
    }

    #[test]
    fn test_create_block_table() {
        let cmd = CreateBlockCommand {
            tenant_id: TenantId::new(Uuid::nil()),
            document_id: Uuid::nil(),
            block_type: BlockType::Table {
                columns: vec!["Name".to_string(), "Age".to_string()],
                rows: vec![vec!["Alice".to_string(), "30".to_string()]],
            },
        };
        let event = create_block(cmd, &MockIdGen, &MockClock);

        match &event.block_type {
            BlockType::Table { columns, rows } => {
                assert_eq!(columns.len(), 2);
                assert_eq!(rows.len(), 1);
                assert_eq!(rows[0][0], "Alice");
            }
            _ => panic!("Expected Table block type"),
        }
    }

    #[test]
    fn test_create_relation() {
        let rel = Relation {
            from_block_id: Uuid::nil(),
            to_block_id: Uuid::nil(),
            relation_type: "foreign_key".to_string(),
        };
        let cmd = CreateRelationCommand {
            tenant_id: TenantId::new(Uuid::nil()),
            relation: rel,
        };
        let event = create_relation(cmd, &MockIdGen, &MockClock);

        assert_eq!(event.relation.relation_type, "foreign_key");
        assert_eq!(
            event.created_at,
            SystemTime::UNIX_EPOCH + Duration::from_secs(2000)
        );
    }
}
