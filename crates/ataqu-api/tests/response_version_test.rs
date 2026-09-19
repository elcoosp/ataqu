#[test]
fn deal_response_preserves_version_for_if_match() {
    let version = 7;
    let now = Utc::now();
    let deal = ataqu_domain_cinq::deal::Deal {
        id: Uuid::new_v4(),
        tenant_id: TenantId::new(Uuid::new_v4()),
        contact_id: Uuid::new_v4(),
        title: "Enterprise".into(),
        pipeline_stage_id: Uuid::new_v4(),
        amount: rust_decimal::Decimal::from(1000),
        status: ataqu_domain_cinq::deal::DealStatus::Open,
        owner_id: None,
        probability: None,
        variant_id: None,
        quantity: None,
        establishment_id: None,
        created_at: now,
        updated_at: now,
        version,
    };
    let response = serde_json::to_value(ataqu_api::handlers::cinq::DealResponse::from(deal))
        .unwrap();
    assert_eq!(
        response["version"],
        json!(version),
        "DealResponse must expose the version the UI sends as If-Match"
    );
}

use ataqu_api::handlers::cinq::ContactResponse;
use ataqu_domain_cinq::contact::Contact;
use ataqu_kernel::TenantId;
use ataqu_security::Email;
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

fn sample_contact(version: i32, custom_fields: serde_json::Value, lead_score: i32) -> Contact {
    let now = Utc::now();
    Contact {
        id: Uuid::new_v4(),
        tenant_id: TenantId::new(Uuid::new_v4()),
        name: "Alice".into(),
        company: None,
        email: Email::new("alice@example.com".into()),

        phone: None,
        custom_fields,
        lead_score,
        created_at: now,
        updated_at: now,
        version,
    }
}

#[test]
fn contact_response_preserves_version_for_if_match() {
    for version in [0, 1, 7] {
        let contact = sample_contact(version, json!({}), 0);
        let response = serde_json::to_value(ContactResponse::from(contact)).unwrap();
        assert_eq!(
            response["version"],
            json!(version),
            "ContactResponse must expose the optimistic-concurrency version the UI sends as If-Match"
        );
    }
}

#[test]
fn contact_response_preserves_lead_score_and_custom_fields() {
    let contact = sample_contact(1, json!({"tier": "gold"}), 42);
    let response = serde_json::to_value(ContactResponse::from(contact)).unwrap();
    assert_eq!(response["lead_score"], json!(42));
    assert_eq!(response["custom_fields"]["tier"], json!("gold"));
}

#[test]
fn deal_and_task_responses_preserve_versions() {
    use ataqu_api::handlers::cinq::{DealResponse, TaskResponse};
    use ataqu_domain_cinq::{deal::{Deal, DealStatus}, task::{Task, TaskStatus}};
    let now = Utc::now();
    for version in [0, 1, 7] {
        let deal = Deal {
            id: Uuid::new_v4(), tenant_id: TenantId::new(Uuid::new_v4()),
            contact_id: Uuid::new_v4(), title: "Deal".into(), pipeline_stage_id: Uuid::new_v4(),
            amount: 12.into(), status: DealStatus::Open, owner_id: None, probability: None,
            variant_id: None, quantity: None, establishment_id: None,
            created_at: now, updated_at: now, version,
        };
        let task = Task {
            id: Uuid::new_v4(), tenant_id: deal.tenant_id, contact_id: None, deal_id: None,
            assigned_to: None, title: "Task".into(), description: None, due_date: None,
            status: TaskStatus::Pending, created_at: now, updated_at: now, version,
        };
        assert_eq!(serde_json::to_value(DealResponse::from(deal)).unwrap()["version"], version);
        assert_eq!(serde_json::to_value(TaskResponse::from(task)).unwrap()["version"], version);
    }
}

#[test]
fn channel_response_preserves_type_and_version() {
    use ataqu_api::handlers::dial::ChannelResponse;
    use ataqu_domain_dial::chat::{Channel, ChannelType};
    let now = std::time::SystemTime::now();
    for (channel_type, wire_type) in [(ChannelType::Public, "public"), (ChannelType::Private, "private"), (ChannelType::DirectMessage, "dm")] {
        for version in [0, 1, 7] {
            let channel = Channel {
                id: Uuid::new_v4().into(), tenant_id: TenantId::new(Uuid::new_v4()),
                name: "Channel".into(), channel_type, created_by: Uuid::new_v4().into(),
                participants: vec![], created_at: now, updated_at: now, archived_at: None, version,
            };
            let value = serde_json::to_value(ChannelResponse::from(channel)).unwrap();
            assert_eq!(value["channel_type"], wire_type);
            assert_eq!(value["version"], version);
        }
    }
}

#[test]
fn message_response_preserves_version_in_paginated_envelope() {
    use ataqu_api::handlers::dial::MessageResponse;
    use ataqu_domain_dial::chat::Message;
    for version in [0, 1, 7] {
        let message = Message {
            id: Uuid::new_v4().into(), tenant_id: TenantId::new(Uuid::new_v4()),
            channel_id: Uuid::new_v4().into(), thread_id: None, author_id: Uuid::new_v4().into(),
            content: "Hello".into(), created_at: std::time::SystemTime::now(),
            edited_at: None, deleted_at: None, version,
        };
        let page = ataqu_contracts::PaginatedResponse {
            items: vec![MessageResponse::from(message)], total: 11, limit: 1, offset: 3,
        };
        let value = serde_json::to_value(page).unwrap();
        assert_eq!(value["items"][0]["version"], version);
        assert_eq!(value["total"], 11);
        assert_eq!(value["limit"], 1);
        assert_eq!(value["offset"], 3);
        assert!(value.get("messages").is_none());
    }
}

#[test]
fn employee_response_preserves_version() {
    use ataqu_api::handlers::pause::EmployeeResponse;
    use ataqu_domain_pause::employee::Employee;
    let now = std::time::SystemTime::now();
    for version in [0, 1, 7] {
        let employee = Employee {
            id: Uuid::new_v4(), tenant_id: TenantId::new(Uuid::new_v4()), full_name: "Alice".into(),
            email: Email::new("alice@example.com".into()), phone: None, job_title: "Engineer".into(),
            department: None, hire_date: Utc::now().date_naive(), is_active: true,
            created_at: now, updated_at: now, version, onboarding_tasks: vec![], onboarding_completed_at: None,
        };
        assert_eq!(serde_json::to_value(EmployeeResponse::from(employee)).unwrap()["version"], version);
    }
}
