use axum::{
    extract::State,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;

#[derive(Debug, Deserialize)]
pub struct ParseRequest {
    pub file: String, // base64 encoded content
    pub format: String, // "csv" or "json"
}

#[derive(Debug, Serialize)]
pub struct ParseResponse {
    pub columns: Vec<String>,
    pub sample: Vec<HashMap<String, String>>,
}

pub async fn parse_file(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<ParseRequest>,
) -> ApiResult<Json<ParseResponse>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden("Admin required".to_string()));
    }

    use base64::Engine;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(&req.file)
        .map_err(|_| ApiResponseError::validation("Invalid base64"))?;

    let sample_rows = match req.format.as_str() {
        "csv" => {
            let mut reader = csv::Reader::from_reader(&decoded[..]);
            let headers = reader.headers()
                .map_err(|_| ApiResponseError::validation("Invalid CSV"))?
                .clone();
            let columns: Vec<String> = headers.iter().map(|s| s.to_string()).collect();
            let mut samples = Vec::new();
            for (i, record) in reader.records().enumerate() {
                if i >= 3 { break; }
                let record = record.map_err(|_| ApiResponseError::validation("Invalid CSV record"))?;
                let mut map = HashMap::new();
                for (idx, field) in record.iter().enumerate() {
                    if let Some(col) = columns.get(idx) {
                        map.insert(col.clone(), field.to_string());
                    }
                }
                samples.push(map);
            }
            ParseResponse { columns, sample: samples }
        }
        "json" => {
            let data: Vec<HashMap<String, String>> = serde_json::from_slice(&decoded)
                .map_err(|_| ApiResponseError::validation("Invalid JSON"))?;
            let columns = if let Some(first) = data.first() {
                first.keys().cloned().collect()
            } else {
                vec![]
            };
            ParseResponse { columns, sample: data.into_iter().take(3).collect() }
        }
        _ => return Err(ApiResponseError::validation("Unsupported format"))
    };

    Ok(Json(sample_rows))
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub target_app: String, // "cinq", "vault", "pause"
    pub mapping: HashMap<String, String>, // source_column -> target_field
    pub data: Vec<HashMap<String, String>>,
}

pub async fn import_data(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<ImportRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden("Admin required".to_string()));
    }

    let tenant_id = auth.tenant_id;
    let mut imported = 0;
    let mut failed = 0;

    match req.target_app.as_str() {
        "cinq" => {
            use ataqu_application::cinq_service::CreateContactCommand;
            use ataqu_security::{Email, PhoneNumber};

            for row in req.data {
                let name = row.get("name").cloned().unwrap_or_default();
                let email_str = row.get("email").cloned().unwrap_or_default();
                let phone_str = row.get("phone").cloned().unwrap_or_default();
                let mut custom = serde_json::Map::new();
                for (col, val) in &row {
                    if !["name", "email", "phone"].contains(&col.as_str()) {
                        custom.insert(col.clone(), serde_json::Value::String(val.clone()));
                    }
                }
                let cmd = CreateContactCommand {
                    tenant_id,
                    name,
                    company: None,
                    email: Email::new(email_str),
                    phone: if phone_str.is_empty() { None } else { Some(PhoneNumber::new(phone_str)) },
                    custom_fields: serde_json::Value::Object(custom),
                    lead_score: None,
                };
                match state.cinq_service.create_contact(cmd).await {
                    Ok(_) => imported += 1,
                    Err(_) => failed += 1,
                }
            }
        }
        "vault" => {
            use ataqu_application::vault_service::CreateProductCommand;
            for row in req.data {
                let name = row.get("name").cloned().unwrap_or_default();
                let description = row.get("description").cloned().unwrap_or_default();
                let sku = row.get("sku").cloned().unwrap_or_default();
                let cmd = CreateProductCommand { tenant_id, name, description, sku };
                match state.vault_service.create_product(cmd).await {
                    Ok(_) => imported += 1,
                    Err(_) => failed += 1,
                }
            }
        }
        "pause" => {
            use ataqu_application::pause_service::CreateEmployeeCommand;
            use ataqu_security::Email;
            use chrono::NaiveDate;
            for row in req.data {
                let full_name = row.get("full_name").cloned().unwrap_or_default();
                let email_str = row.get("email").cloned().unwrap_or_default();
                let job_title = row.get("job_title").cloned().unwrap_or_default();
                let hire_date_str = row.get("hire_date").cloned().unwrap_or_default();
                let hire_date = NaiveDate::parse_from_str(&hire_date_str, "%Y-%m-%d").unwrap_or(NaiveDate::from_ymd_opt(2024, 1, 1).unwrap());
                let cmd = CreateEmployeeCommand {
                    tenant_id,
                    full_name,
                    email: Email::new(email_str),
                    phone: None,
                    job_title,
                    department: None,
                    hire_date,
                };
                match state.pause_service.create_employee(&tenant_id, cmd, &*state.id_gen, &*state.clock, Uuid::new_v4()).await {
                    Ok(_) => imported += 1,
                    Err(_) => failed += 1,
                }
            }
        }
        _ => return Err(ApiResponseError::validation("Unsupported target app"))
    }

    Ok(Json(serde_json::json!({ "imported": imported, "failed": failed })))
}

pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::post;
    axum::Router::new()
        .route("/migration/parse", post(parse_file))
        .route("/migration/import", post(import_data))
}
