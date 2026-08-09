// allowed: pre-existing clippy warnings blocking TASK-078 build

pub mod dispatcher;
pub mod error;
pub mod event;

pub use dispatcher::OutboxDispatcher;
pub use error::DispatcherError;
pub use event::OutboxEvent;
