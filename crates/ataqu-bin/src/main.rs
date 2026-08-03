//! Ataqu unified server entry point.
//! Starts the Axum HTTP server, runs the outbox dispatcher in the background,
//! and sets up idempotency middleware.

use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use uuid::Uuid;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;

use ataqu_api::{AppState, create_router, UserRepoPlaceholder, OutboxPlaceholder, AegisDomainPlaceholder};
use ataqu_application::{
    aegis_service::AegisService,
    cinq_service::CinqService,
    dial_service::DialService,
    pivot_service::PivotService,
    sond_service::SondService,
    spark_service::SparkService,
    tempo_service::TempoService,
    vault_service::VaultService,
    vista_service::VistaService,
    pause_service::PauseService,
};
use ataqu_kernel::{Clock, IdGenerator};

use ataqu_infra_outbox::OutboxDispatcher;
use ataqu_infra_idempotency::IdempotencyCache;
use ataqu_infra_pools::Pools;
use ataqu_infra_repositories;

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
// Outbox event handler (placeholder – will be expanded later)
// ------------------------------------------------------------------------------
async fn handle_outbox_event(event: ataqu_infra_outbox::OutboxEvent) -> Result<(), ataqu_infra_outbox::DispatcherError> {
    info!(
        "Processing outbox event: id={}, schema={}, event_type={}",
        event.id, event.schema, event.event_type
    );
    // TODO: Route to appropriate handlers based on schema/event_type
    Ok(())
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

    // Idempotency cache (hot path) – use in middleware later
    let _idempotency_cache = IdempotencyCache::new();

    // Build services

    // AEGIS – use the placeholders defined in ataqu-api/lib.rs
    let aegis_repo = Arc::new(UserRepoPlaceholder);
    let aegis_outbox = Arc::new(OutboxPlaceholder);
    let aegis_domain = Arc::new(AegisDomainPlaceholder);
    let aegis_service = Arc::new(AegisService::new(
        aegis_repo,
        aegis_outbox,
        aegis_domain,
        id_gen.clone(),
        clock.clone(),
    ));

    // CINQ
        // CINQ with real repositories
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
        // DIAL with real repository and presence
    use ataqu_infra_repositories::dial_repo_impl::{DialRepositoryImpl, InMemoryPresenceStore};
    let dial_repo = Arc::new(DialRepositoryImpl::new(pools.core.clone()));
    let dial_presence = Arc::new(InMemoryPresenceStore::new());
    let dial_service = Arc::new(DialService::new(
        dial_repo,
        dial_presence,
        id_gen.clone(),
        clock.clone(),
    ));

    // PIVOT
        // PIVOT with real repositories
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
        // SOND with real repository
    use ataqu_infra_repositories::sond_repo_impl::SondRepositoryImpl;
    let sond_repo = Arc::new(SondRepositoryImpl::new(pools.core.clone()));
    let sond_service = Arc::new(SondService::new(
        sond_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // SPARK
    let spark_service = Arc::new(SparkService::new(id_gen.clone(), clock.clone()));

    // TEMPO
    let tempo_outbox = Arc::new(ataqu_application::tempo_service::DummyOutbox);
    let tempo_service = Arc::new(TempoService::new(tempo_outbox, id_gen.clone(), clock.clone()));

    // VAULT
    let vault_service = Arc::new(VaultService::new(id_gen.clone(), clock.clone()));

    // VISTA
    let vista_outbox = Arc::new(ataqu_application::vista_service::InMemoryOutbox::default());
    let vista_kpi = Arc::new(ataqu_application::vista_service::InMemoryKpiStore::default());
    let vista_service = Arc::new(VistaService::new(vista_outbox, vista_kpi, clock.clone()));

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
    };

    // Create router
    let app = create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // Start outbox dispatcher in the background
    let dispatcher_pool = pools.dispatcher.clone();
    let dispatcher = OutboxDispatcher::new(dispatcher_pool, handle_outbox_event);
    tokio::spawn(async move {
        dispatcher.run().await;
    });

    // Start server using axum::serve (new style)
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Listening on http://{}", addr);
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
