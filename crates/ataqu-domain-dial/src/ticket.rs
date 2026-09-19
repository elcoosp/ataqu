//! Dial support-ticket domain model (docs B3/§3-P0-9).
//!
//! Tickets back the Dial support desk UI (`ticket-list.tsx` /
//! `ticket-detail.tsx`). JSON contract mirrors what the UI expects:
//! snake_case, ISO timestamps, string enums.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
	Open,
	Pending,
	Resolved,
	Closed,
}

impl TicketStatus {
	pub fn as_str(self) -> &'static str {
		match self {
			Self::Open => "open",
			Self::Pending => "pending",
			Self::Resolved => "resolved",
			Self::Closed => "closed",
		}
	}

	pub fn from_str(raw: &str) -> Option<Self> {
		match raw {
			"open" => Some(Self::Open),
			"pending" => Some(Self::Pending),
			"resolved" => Some(Self::Resolved),
			"closed" => Some(Self::Closed),
			_ => None,
		}
	}
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TicketPriority {
	Low,
	Medium,
	High,
	Urgent,
}

impl TicketPriority {
	pub fn as_str(self) -> &'static str {
		match self {
			Self::Low => "low",
			Self::Medium => "medium",
			Self::High => "high",
			Self::Urgent => "urgent",
		}
	}

	pub fn from_str(raw: &str) -> Option<Self> {
		match raw {
			"low" => Some(Self::Low),
			"medium" => Some(Self::Medium),
			"high" => Some(Self::High),
			"urgent" => Some(Self::Urgent),
			_ => None,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ticket {
	pub id: Uuid,
	pub tenant_id: Uuid,
	pub subject: String,
	#[serde(default)]
	pub description: String,
	pub status: TicketStatus,
	pub priority: TicketPriority,
	pub requester_name: String,
	pub requester_email: String,
	pub assignee_id: Option<Uuid>,
	#[serde(default)]
	pub channel_type: Option<String>,
	#[serde(default)]
	pub message_id: Option<Uuid>,
	/// Latest reply preview for list views.
	#[serde(default)]
	pub last_message: Option<String>,
	#[serde(default)]
	pub last_message_at: Option<DateTime<Utc>>,
	pub created_at: DateTime<Utc>,
	pub updated_at: DateTime<Utc>,
}

/// A reply in a ticket's message thread.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketMessage {
	pub id: Uuid,
	pub tenant_id: Uuid,
	pub ticket_id: Uuid,
	pub from_customer: bool,
	pub content: String,
	pub created_at: DateTime<Utc>,
}

/// Payload for creating a ticket (status always starts `open`).
#[derive(Debug, Clone, Deserialize)]
pub struct CreateTicket {
	pub subject: String,
	#[serde(default)]
	pub description: String,
	#[serde(default)]
	pub priority: Option<TicketPriority>,
	#[serde(default)]
	pub requester_name: Option<String>,
	#[serde(default)]
	pub requester_email: Option<String>,
	#[serde(default)]
	pub assignee_id: Option<Uuid>,
	#[serde(default)]
	pub channel_type: Option<String>,
	#[serde(default)]
	pub message_id: Option<Uuid>,
}

/// Partial update payload; `None` fields are left untouched.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpdateTicket {
	pub subject: Option<String>,
	pub description: Option<String>,
	pub status: Option<TicketStatus>,
	pub priority: Option<TicketPriority>,
	pub assignee_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn ticket_status_round_trips() {
		assert_eq!(TicketStatus::Open.as_str(), "open");
		assert_eq!(
			TicketStatus::from_str("in_progress"),
			None,
			"status parsing is honest, no silent fallback"
		);
	}

	#[test]
	fn ticket_priority_round_trips() {
		assert_eq!(TicketPriority::Urgent.as_str(), "urgent");
		assert_eq!(TicketPriority::from_str("urgent"), Some(TicketPriority::Urgent));
	}
}
