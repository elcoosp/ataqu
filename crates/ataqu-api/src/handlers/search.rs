use crate::{
    AppState,
    error::{ApiResponseError, ApiResult},
    middleware::AuthContext,
};
use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};

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
    let overall_limit = std::cmp::min(limit, 50);
    let mut results = Vec::new();

    let contacts = state
        .cinq_service
        .search_contacts(auth.tenant_id, &params.q, limit)
        .await
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

    let messages = state
        .dial_service
        .search_messages(auth.tenant_id, &params.q, limit, 0)
        .await
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

    let docs = state
        .pivot_service
        .search_documents(auth.tenant_id, params.q.clone(), limit, 0)
        .await
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

    let products = state
        .vault_service
        .list_products(auth.tenant_id, limit, 0)
        .await
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

    let employees = state
        .pause_service
        .search_employees(&auth.tenant_id, &params.q, limit)
        .await
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

    let workflows = state
        .spark_service
        .list_workflows(auth.tenant_id, limit, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for w in workflows {
        if w.name.contains(&params.q) {
            results.push(UnifiedSearchResult {
                app: "spark".to_string(),
                entity_type: "workflow".to_string(),
                id: w.id,
                title: w.name,
                subtitle: None,
            });
        }
    }

    let dashboards = state
        .vista_service
        .list_dashboards(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for d in dashboards {
        if d.name.contains(&params.q) {
            results.push(UnifiedSearchResult {
                app: "vista".to_string(),
                entity_type: "dashboard".to_string(),
                id: d.id,
                title: d.name,
                subtitle: None,
            });
        }
    }

    let event_types = state
        .tempo_service
        .list_event_types(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for et in event_types {
        if et.name.contains(&params.q) || et.slug.contains(&params.q) {
            results.push(UnifiedSearchResult {
                app: "tempo".to_string(),
                entity_type: "event_type".to_string(),
                id: et.id.0,
                title: et.name,
                subtitle: Some(et.slug),
            });
        }
    }

    let forms = state
        .sond_service
        .list_forms(auth.tenant_id, limit, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for f in forms {
        if f.title.contains(&params.q) {
            results.push(UnifiedSearchResult {
                app: "sond".to_string(),
                entity_type: "form".to_string(),
                id: f.id,
                title: f.title,
                subtitle: f.description,
            });
        }
    }

    let users = state
        .aegis_service
        .list_users(auth.tenant_id.as_uuid())
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for u in users {
        let email_str = u.email.reveal(&ataqu_security::PiiAccessKey::new()).to_string();
        if email_str.contains(&params.q) || u.name.as_deref().map(|n| n.contains(&params.q)).unwrap_or(false) {
            results.push(UnifiedSearchResult {
                app: "aegis".to_string(),
                entity_type: "user".to_string(),
                id: u.id,
                title: u.name.unwrap_or_else(|| email_str.clone()),
                subtitle: Some(email_str),
            });
        }
    }

    results.truncate(overall_limit as usize);
    Ok(Json(results))
}
