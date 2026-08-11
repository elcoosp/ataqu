// allowed: pre-existing clippy warnings blocking TASK-078 build

pub mod encryption;
pub mod pii;
pub use pii::{Email, PhoneNumber, PiiAccessKey};
