use axum::{extract::{Query, State}, response::Json};
use serde::{Deserialize, Serialize};
use crate::{AppState, error::{ApiResponseError, ApiResult}, middleware::AuthContext};

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub limit: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct UnifiedSearchResult {
    pub app: String,
    pub entity_type: String,
    pub id: uuid::Uuid,
    pub title: String,
    pub subtitle: Option<String>,
}

pub async fn unified_search(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<UnifiedSearchResult>>> {
    let limit = params.limit.unwrap_or(20);
    let mut results = Vec::new();

    let contacts = state.cinq_service.search_contacts(auth.tenant_id, &params.q, limit).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for c in contacts {
        results.push(UnifiedSearchResult {
            app: "cinq".to_string(),
            entity_type: "contact".to_string(),
            id: c.id,
            title: c.name,
            subtitle: c.company,
        });
    }

    let messages = state.dial_service.search_messages(auth.tenant_id, &params.q, limit, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for m in messages {
        results.push(UnifiedSearchResult {
            app: "dial".to_string(),
            entity_type: "message".to_string(),
            id: m.id.as_uuid(),
            title: m.content.chars().take(50).collect(),
            subtitle: None,
        });
    }

    let docs = state.pivot_service.search_documents(auth.tenant_id, params.q.clone(), limit, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for d in docs {
        results.push(UnifiedSearchResult {
            app: "pivot".to_string(),
            entity_type: "document".to_string(),
            id: d.id,
            title: d.title,
            subtitle: None,
        });
    }

    let products = state.vault_service.list_products(auth.tenant_id, limit, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for p in products {
        if p.name.contains(&params.q) || p.sku.contains(&params.q) {
            results.push(UnifiedSearchResult {
                app: "vault".to_string(),
                entity_type: "product".to_string(),
                id: p.id,
                title: p.name,
                subtitle: Some(p.sku),
            });
        }
    }

    let employees = state.pause_service.search_employees(&auth.tenant_id, &params.q, limit).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for e in employees {
        results.push(UnifiedSearchResult {
            app: "pause".to_string(),
            entity_type: "employee".to_string(),
            id: e.id,
            title: e.full_name,
            subtitle: Some(e.job_title),
        });
    }

    Ok(Json(results))
}
