use crate::primitives::{Clock, IdGenerator, TenantId, Uuid};
use std::time::SystemTime;

#[derive(Debug, Clone)]
pub struct CreateDocumentCommand {
    pub tenant_id: TenantId,
    pub title: String,
    pub content: String, // Markdown content
}

#[derive(Debug, Clone)]
pub struct DocumentCreatedEvent {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: String,
    pub content: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

pub fn create_document(
    cmd: CreateDocumentCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> DocumentCreatedEvent {
    DocumentCreatedEvent {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        title: cmd.title,
        content: cmd.content,
        created_at: clock.now(),
        updated_at: clock.now(),
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
            SystemTime::UNIX_EPOCH + Duration::from_secs(1000)
        }
    }

    #[test]
    fn test_create_document() {
        let cmd = CreateDocumentCommand {
            tenant_id: TenantId::new(Uuid::nil()),
            title: "Test Doc".to_string(),
            content: "# Hello World".to_string(),
        };
        let event = create_document(cmd, &MockIdGen, &MockClock);

        assert_eq!(event.title, "Test Doc");
        assert_eq!(event.content, "# Hello World");
        assert_eq!(
            event.created_at,
            SystemTime::UNIX_EPOCH + Duration::from_secs(1000)
        );
    }
}

#[derive(Debug, Clone)]
pub struct DocumentVersion {
    pub id: uuid::Uuid,
    pub tenant_id: crate::primitives::TenantId,
    pub document_id: uuid::Uuid,
    pub title: String,
    pub content: String,
    pub created_at: std::time::SystemTime,
}

#[derive(Debug, Clone)]
pub struct Template {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub content: String,
    pub created_at: SystemTime,
}
