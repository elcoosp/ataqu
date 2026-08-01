#![allow(unexpected_cfgs)]
//! Security primitives for Ataqu.
//!
//! This crate provides compile‑time PII redaction via newtypes,
//! plus cryptographic utilities (to be added in future phases).

pub mod pii;

// Re-export the most common types for convenience.
pub use pii::{Email, PhoneNumber, PiiAccessKey};
