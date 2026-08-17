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
    let overall_limit = std::cmp::min(limit, 50) as usize;
    let mut results = Vec::new();

    let contacts = state
        .cinq_service
        .search_contacts(auth.tenant_id, &params.q, limit)
        .await
        .map_err(ApiResponseError::internal_err)?;
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
        .search_messages(auth.tenant_id, auth.user_id, &params.q, limit, 0)
        .await
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
    for d in docs {
        results.push(UnifiedSearchResult {
            app: "pivot".to_string(),
            entity_type: "document".to_string(),
            id: d.id,
            title: d.title,
            subtitle: None,
        });
    }

    let employees = state
        .pause_service
        .search_employees(&auth.tenant_id, &params.q, limit)
        .await
        .map_err(ApiResponseError::internal_err)?;
    for e in employees {
        results.push(UnifiedSearchResult {
            app: "pause".to_string(),
            entity_type: "employee".to_string(),
            id: e.id,
            title: e.full_name,
            subtitle: Some(e.job_title),
        });
    }

    let users = state
        .aegis_service
        .list_users(auth.tenant_id)
        .await
        .map_err(ApiResponseError::internal_err)?;
    let user_matches: Vec<_> = users
        .into_iter()
        .filter(|u| {
            let email_str = u
                .email
                .reveal(&ataqu_security::PiiAccessKey::new())
                .to_string();
            email_str.contains(&params.q)
                || u.name
                    .as_deref()
                    .map(|n| n.contains(&params.q))
                    .unwrap_or(false)
        })
        .take(overall_limit)
        .collect();
    for u in user_matches {
        results.push(UnifiedSearchResult {
            app: "aegis".to_string(),
            entity_type: "user".to_string(),
            id: u.id,
            title: u.name.unwrap_or_else(|| "Unknown".to_string()),
            subtitle: None,
        });
    }

    let (products, _total) = state
        .vault_service
        .list_products(auth.tenant_id, 100, 0)
        .await
        .map_err(ApiResponseError::internal_err)?;
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

    let (workflows, _total) = state
        .spark_service
        .list_workflows(auth.tenant_id, 100, 0)
        .await
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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

    let (event_types, _total) = state
        .tempo_service
        .list_event_types(auth.tenant_id, 100, 0)
        .await
        .map_err(ApiResponseError::internal_err)?;
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

    let (forms, _total) = state
        .sond_service
        .list_forms(auth.tenant_id, 100, 0)
        .await
        .map_err(ApiResponseError::internal_err)?;
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

    results.truncate(overall_limit);
    Ok(Json(results))
}
