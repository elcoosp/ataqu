use ataqu_kernel::TenantId;
use ataqu_security::{Email, PhoneNumber};
use uuid::Uuid;

use crate::contact::CreateContactCommand;
use crate::deal::{CreateDealCommand, DealStatus};
use crate::error::{CinqDomainError, CinqResult};
use crate::pipeline::CreatePipelineStageCommand;

/// Validate a row representing a contact CSV import.
/// Expected columns: tenant_id, name, email, phone
pub fn validate_contact_row(row: &[String]) -> CinqResult<CreateContactCommand> {
    if row.len() < 4 {
        return Err(CinqDomainError::MissingField(
            "Not enough columns".to_string(),
        ));
    }
    let tenant_id = Uuid::parse_str(&row[0])
        .map_err(|_| CinqDomainError::Validation("Invalid tenant_id UUID".to_string()))
        .map(TenantId::new)?;
    let name = row[1].clone();
    if name.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Name cannot be empty".to_string(),
        ));
    }
    let email = Email::new(row[2].clone());
    let phone = if row[3].is_empty() {
        None
    } else {
        Some(PhoneNumber::new(row[3].clone()))
    };
    Ok(CreateContactCommand {
        tenant_id,
        name,
        email,
        phone,
    })
}

/// Validate a row representing a deal CSV import.
/// Columns: tenant_id, contact_id, pipeline_stage_id, amount, status
pub fn validate_deal_row(row: &[String]) -> CinqResult<CreateDealCommand> {
    if row.len() < 5 {
        return Err(CinqDomainError::MissingField(
            "Not enough columns".to_string(),
        ));
    }
    let tenant_id = Uuid::parse_str(&row[0])
        .map_err(|_| CinqDomainError::Validation("Invalid tenant_id UUID".to_string()))
        .map(TenantId::new)?;
    let contact_id = Uuid::parse_str(&row[1])
        .map_err(|_| CinqDomainError::Validation("Invalid contact_id UUID".to_string()))?;
    let pipeline_stage_id = Uuid::parse_str(&row[2])
        .map_err(|_| CinqDomainError::Validation("Invalid pipeline_stage_id UUID".to_string()))?;
    let amount: rust_decimal::Decimal = row[3]
        .parse()
        .map_err(|_| CinqDomainError::Validation("Invalid amount".to_string()))?;
    if amount <= rust_decimal::Decimal::ZERO {
        return Err(CinqDomainError::InvalidAmount);
    }
    let status = match row[4].to_lowercase().as_str() {
        "open" => DealStatus::Open,
        "won" => DealStatus::Won,
        "lost" => DealStatus::Lost,
        _ => return Err(CinqDomainError::Validation("Invalid status".to_string())),
    };
    Ok(CreateDealCommand {
        tenant_id,
        contact_id,
        title: "Imported Deal".to_string(), // placeholder, should come from CSV
        pipeline_stage_id,
        amount,
        status,
    })
}

/// Validate a row representing a pipeline stage CSV import.
/// Columns: tenant_id, name, order
pub fn validate_pipeline_stage_row(row: &[String]) -> CinqResult<CreatePipelineStageCommand> {
    if row.len() < 3 {
        return Err(CinqDomainError::MissingField(
            "Not enough columns".to_string(),
        ));
    }
    let tenant_id = Uuid::parse_str(&row[0])
        .map_err(|_| CinqDomainError::Validation("Invalid tenant_id UUID".to_string()))
        .map(TenantId::new)?;
    let name = row[1].clone();
    if name.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Name cannot be empty".to_string(),
        ));
    }
    let order: i32 = row[2]
        .parse()
        .map_err(|_| CinqDomainError::Validation("Invalid order".to_string()))?;
    if order < 0 {
        return Err(CinqDomainError::InvalidOrder);
    }
    Ok(CreatePipelineStageCommand {
        tenant_id,
        name,
        order,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contact_row_valid() {
        let row = vec![
            "f47ac10b-58cc-4372-a567-0e02b2c3d479".to_string(),
            "Alice".to_string(),
            "alice@example.com".to_string(),
            "+1234567890".to_string(),
        ];
        let result = validate_contact_row(&row);
        assert!(result.is_ok());
        let cmd = result.unwrap();
        assert_eq!(cmd.name, "Alice");
        assert!(cmd.phone.is_some());
    }

    #[test]
    fn contact_row_empty_phone() {
        let row = vec![
            "f47ac10b-58cc-4372-a567-0e02b2c3d479".to_string(),
            "Alice".to_string(),
            "alice@example.com".to_string(),
            "".to_string(),
        ];
        let result = validate_contact_row(&row);
        assert!(result.is_ok());
        let cmd = result.unwrap();
        assert!(cmd.phone.is_none());
    }

    #[test]
    fn contact_row_invalid_uuid() {
        let row = vec![
            "not-a-uuid".to_string(),
            "Alice".to_string(),
            "alice@example.com".to_string(),
            "+123".to_string(),
        ];
        let result = validate_contact_row(&row);
        assert!(result.is_err());
    }
}
