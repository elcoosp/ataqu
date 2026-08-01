use crate::block::{BlockCreatedEvent, RelationCreatedEvent};
use crate::document::DocumentCreatedEvent;
use crate::primitives::{TenantId, Uuid};

pub trait PivotRepository {
    type Error;

    fn save_document(&self, event: &DocumentCreatedEvent) -> Result<(), Self::Error>;
    fn save_block(&self, event: &BlockCreatedEvent) -> Result<(), Self::Error>;
    fn save_relation(&self, event: &RelationCreatedEvent) -> Result<(), Self::Error>;

    fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, Self::Error>;
}
