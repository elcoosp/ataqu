//! Ataqu unified server entry point.
//! Starts the Axum HTTP server, runs the outbox dispatcher in the background,
//! and sets up idempotency middleware.

use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;

use ataqu_api::{AppState, OutboxPlaceholder, create_router};
use ataqu_application::aegis_service::{AegisService, RealAegisDomain, AegisConfig};
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;
use ataqu_application::pause_service::PauseService;
use ataqu_kernel::{Clock, IdGenerator};

use ataqu_infra_outbox::OutboxDispatcher;
use ataqu_infra_idempotency::IdempotencyCache;
use ataqu_infra_pools::Pools;

// ------------------------------------------------------------------------------
// System implementations
// ------------------------------------------------------------------------------
pub struct SystemIdGenerator;
impl IdGenerator for SystemIdGenerator {
    fn new_uuid_v7(&self) -> uuid::Uuid {
        uuid::Uuid::now_v7()
    }
}

pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> std::time::SystemTime {
        std::time::SystemTime::now()
    }
}

// ------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(true)
        .init();

    info!("Starting Ataqu unified server...");

    // Database URL (should come from env)
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@127.0.0.1:5433/ataqu".to_string());

    // Initialize database pools
    let pools = Pools::new(&db_url).await?;

    // Capabilities
    let id_gen = Arc::new(SystemIdGenerator);
    let clock = Arc::new(SystemClock);

    // JWT secret configuration
    let jwt_secret_raw = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "change-me-in-production-32-bytes!!".into())
        .into_bytes();
    let jwt_secret = Arc::new(jwt_secret_raw.clone());
    let aegis_config = AegisConfig {
        jwt_secret: jwt_secret_raw,
        access_token_ttl: Duration::from_secs(900),
        refresh_token_ttl: Duration::from_secs(604800),
    };

    // Idempotency cache (hot path) – use in middleware later
    let _idempotency_cache = IdempotencyCache::new();

    // Build services

    // AEGIS – real SeaORM repository and domain, using OutboxPlaceholder from ataqu-api
    use ataqu_infra_repositories::aegis_repo::AegisUserRepository;
    let aegis_repo = Arc::new(AegisUserRepository::new(pools.core.clone()));
    let aegis_outbox = Arc::new(OutboxPlaceholder);
    let aegis_domain = Arc::new(RealAegisDomain);
    let aegis_service = Arc::new(AegisService::new(
        aegis_repo,
        aegis_outbox,
        aegis_domain,
        id_gen.clone(),
        clock.clone(),
        aegis_config,
    ));

    // CINQ
    use ataqu_infra_repositories::cinq_repo_impl::{
        CinqContactRepository, CinqDealRepository,
        CinqActivityRepository, CinqPipelineStageRepository,
    };
    let contact_repo = Arc::new(CinqContactRepository::new(pools.core.clone()));
    let deal_repo = Arc::new(CinqDealRepository::new(pools.core.clone()));
    let activity_repo = Arc::new(CinqActivityRepository::new(pools.core.clone()));
    let stage_repo = Arc::new(CinqPipelineStageRepository::new(pools.core.clone()));
    let cinq_service = Arc::new(CinqService::new(
        contact_repo,
        deal_repo,
        activity_repo,
        stage_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // DIAL
    use ataqu_infra_repositories::dial_repo_impl::{DialRepositoryImpl, DbPresenceStore};
    let dial_repo = Arc::new(DialRepositoryImpl::new(pools.core.clone()));
    let dial_presence = Arc::new(DbPresenceStore::new(pools.core.clone()));
    let dial_service = Arc::new(DialService::new(
        dial_repo,
        dial_presence,
        id_gen.clone(),
        clock.clone(),
    ));

    // PIVOT
    use ataqu_infra_repositories::pivot_repo_impl::{
        PivotDocumentRepository, PivotBlockRepository, PivotRelationRepository,
    };
    let pivot_doc_repo = Arc::new(PivotDocumentRepository::new(pools.core.clone()));
    let pivot_block_repo = Arc::new(PivotBlockRepository::new(pools.core.clone()));
    let pivot_rel_repo = Arc::new(PivotRelationRepository::new(pools.core.clone()));
    let pivot_service = Arc::new(PivotService::new(
        pivot_doc_repo,
        pivot_block_repo,
        pivot_rel_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // SOND
    use ataqu_infra_repositories::sond_repo_impl::SondRepositoryImpl;
    let sond_repo = Arc::new(SondRepositoryImpl::new(pools.core.clone()));
    let sond_service = Arc::new(SondService::new(
        sond_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // SPARK
    use ataqu_infra_repositories::spark_repo_impl::SparkRepositoryImpl;
    let spark_repo = Arc::new(SparkRepositoryImpl::new(pools.core.clone()));
    let spark_service = Arc::new(SparkService::new(
        spark_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // TEMPO
    use ataqu_infra_repositories::tempo_repo_impl::TempoRepositoryImpl;
    let tempo_repo = Arc::new(TempoRepositoryImpl::new(pools.core.clone()));
    let tempo_service = Arc::new(TempoService::new(
        tempo_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // VAULT
    use ataqu_infra_repositories::vault_repo_impl::VaultRepositoryImpl;
    let vault_repo = Arc::new(VaultRepositoryImpl::new(pools.core.clone()));
    let vault_service = Arc::new(VaultService::new(
        vault_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // VISTA
    use ataqu_infra_repositories::vista_repo_impl::VistaRepositoryImpl;
    let vista_repo = Arc::new(VistaRepositoryImpl::new(pools.core.clone()));
    let vista_service = Arc::new(VistaService::new(
        vista_repo,
        clock.clone(),
    ));

    // PAUSE – real repositories, real idempotency, real outbox
    use ataqu_infra_repositories::pause_repo_impl::PauseRepositoryImpl;
    use ataqu_application::pause_infra::{RealIdempotency, RealOutbox};

    let pause_idempotency = Arc::new(RealIdempotency::new(pools.core.clone()));
    let pause_employee_repo = Arc::new(PauseRepositoryImpl::new(pools.core.clone()));
    let pause_leave_repo = Arc::new(PauseRepositoryImpl::new(pools.core.clone()));
    let pause_outbox = Arc::new(RealOutbox::new(pools.core.clone()));
    let pause_service = Arc::new(PauseService::new(
        pause_idempotency,
        pause_employee_repo,
        pause_leave_repo,
        pause_outbox,
    ));

    // Build AppState
    let vista_service_for_outbox = vista_service.clone();
    let state = AppState {
        cinq_service,
        dial_service,
        pivot_service,
        sond_service,
        spark_service,
        tempo_service,
        vault_service,
        vista_service,
        aegis_service,
        pause_service,
        jwt_secret,
        id_gen: id_gen.clone(),
        clock: clock.clone(),
    };

    // Create router
    let app = create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // Start outbox dispatcher in the background
    let dispatcher_pool = pools.dispatcher.clone();

    let handler = move |event: ataqu_infra_outbox::OutboxEvent| {
        let vista = vista_service_for_outbox.clone();
        async move {
            // Process the event only if it's for VISTA or SPARK
            match event.schema.as_str() {
                "vista" | "spark" | "core" => {
                    if let Err(e) = vista.process_event(&event).await {
                        tracing::error!(error = %e, "Failed to process outbox event");
                    }
                }
                _ => {
                    tracing::warn!("Unknown schema: {}", event.schema);
                }
            }
            Ok(())
        }
    };
    let dispatcher = OutboxDispatcher::new(dispatcher_pool, handler);
    tokio::spawn(async move {
        dispatcher.run().await;
    });

    // Start server with graceful shutdown
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Listening on http://{}", addr);
    let listener = TcpListener::bind(addr).await?;

    let shutdown = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
        info!("Shutdown signal received, gracefully shutting down...");
    };

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown)
        .await?;

    info!("Server shut down.");
    Ok(())
}
