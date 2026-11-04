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

    /// Dispatch an event to every registered handler.
    ///
    /// RELIABILITY (fixed in audit): the previous implementation *swallowed*
    /// handler errors and always returned `Ok(())` — the dispatcher then
    /// marked the event `completed`, so a failed side effect (lead not
    /// created, DM not sent, webhook not delivered) was silently lost with no
    /// retry and no DLQ. The last handler error is now propagated so the
    /// dispatcher's attempt/backoff/DLQ machinery runs.
    ///
    /// Events with NO registered handler are explicitly reported: they are
    /// emitted by producers but nobody consumes them (dead feature). They are
    /// logged at WARN with a metric and returned as an error so the event
    /// dead-letters instead of being marked completed — the operations signal
    /// that a consumer is missing.
    pub async fn dispatch(&self, event: OutboxEvent) -> Result<(), String> {
        let key = (event.schema.clone(), event.event_type.clone());
        match self.handlers.get(&key) {
            Some(handlers) if !handlers.is_empty() => {
                let mut last_err: Option<String> = None;
                for handler in handlers {
                    if let Err(e) = handler(event.clone()).await {
                        tracing::error!(
                            event_id = %event.id,
                            event_type = %event.event_type,
                            "Handler failed: {}",
                            e
                        );
                        last_err = Some(e);
                    }
                }
                match last_err {
                    Some(e) => Err(e),
                    None => Ok(()),
                }
            }
            _ => {
                metrics::counter!(
                    "ataqu_outbox_unhandled_events_total",
                    "schema" => event.schema.clone(),
                    "event_type" => event.event_type.clone(),
                )
                .increment(1);
                let msg = format!(
                    "no handler registered for {}/{}",
                    event.schema, event.event_type
                );
                tracing::warn!(
                    event_id = %event.id,
                    event_type = %event.event_type,
                    "{}",
                    msg
                );
                Err(msg)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn test_event(event_type: &str) -> OutboxEvent {
        serde_json::from_value(json!({
            "id": 1,
            "schema": "test",
            "event_type": event_type,
            "aggregate_id": null,
            "payload": {"tenant_id": uuid::Uuid::nil()},
            "status": "pending",
            "priority": "normal",
            "attempts": 0,
            "locked_until": null,
            "vista_consumed_at": null,
            "created_at": "2026-01-01T00:00:00Z",
            "completed_at": null,
        }))
        .expect("valid test event")
    }

    #[tokio::test]
    async fn handler_errors_are_propagated() {
        let mut registry = EventRegistry::new();
        registry.register("test", "Boom", |_evt| async {
            Err("handler exploded".to_string())
        });
        let res = registry.dispatch(test_event("Boom")).await;
        assert_eq!(res.unwrap_err(), "handler exploded");
    }

    #[tokio::test]
    async fn successful_handlers_return_ok() {
        let mut registry = EventRegistry::new();
        registry.register("test", "Ok", |_evt| async { Ok(()) });
        assert!(registry.dispatch(test_event("Ok")).await.is_ok());
    }

    #[tokio::test]
    async fn unhandled_events_are_errors() {
        let registry = EventRegistry::new();
        let res = registry.dispatch(test_event("NobodyHome")).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("no handler"));
    }

    #[tokio::test]
    async fn last_error_wins_when_multiple_handlers_fail() {
        let mut registry = EventRegistry::new();
        registry.register("test", "Multi", |_evt| async { Err("first".to_string()) });
        registry.register("test", "Multi", |_evt| async { Err("second".to_string()) });
        assert_eq!(
            registry.dispatch(test_event("Multi")).await.unwrap_err(),
            "second"
        );
    }
}
