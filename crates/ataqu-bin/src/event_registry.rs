use ataqu_infra_outbox::OutboxEvent;
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

pub type EventHandler = Arc<
    dyn Fn(OutboxEvent) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> + Send + Sync,
>;

#[derive(Clone)]
pub struct EventRegistry {
    handlers: HashMap<(String, String), Vec<EventHandler>>,
}

impl EventRegistry {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    pub fn register<F, Fut>(&mut self, schema: &str, event_type: &str, handler: F)
    where
        F: Fn(OutboxEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), String>> + Send + 'static,
    {
        let key = (schema.to_string(), event_type.to_string());
        let wrapped = Arc::new(
            move |evt: OutboxEvent| -> Pin<Box<dyn Future<Output = Result<(), String>> + Send>> {
                Box::pin(handler(evt))
            },
        );
        self.handlers.entry(key).or_default().push(wrapped);
    }

    pub async fn dispatch(&self, event: OutboxEvent) -> Result<(), String> {
        let key = (event.schema.clone(), event.event_type.clone());
        if let Some(handlers) = self.handlers.get(&key) {
            for handler in handlers {
                if let Err(e) = handler(event.clone()).await {
                    tracing::error!(event_id = %event.id, "Handler failed: {}", e);
                }
            }
        }
        Ok(())
    }
}
