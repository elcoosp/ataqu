//! Ataqu unified server entry point.
//! Starts the Axum HTTP server, runs the outbox dispatcher in the background,
//! and sets up idempotency middleware.

use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;
use uuid::Uuid;

use ataqu_api::{AppState, create_router};
use ataqu_application::aegis_service::{AegisConfig, AegisService, RealAegisDomain};
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

use ataqu_infra_outbox::OutboxDispatcher;
use ataqu_infra_pools::Pools;

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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(true)
        .init();

    info!("Starting Ataqu unified server...");

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@127.0.0.1:5433/ataqu".to_string());

    let pools = Pools::new(&db_url).await?;

    let id_gen = Arc::new(SystemIdGenerator);
    let clock = Arc::new(SystemClock);

    let jwt_secret_raw = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "change-me-in-production-32-bytes".into())
        .into_bytes();
    let jwt_secret = Arc::new(jwt_secret_raw.clone());
    let aegis_config = AegisConfig {
        jwt_secret: jwt_secret_raw,
        access_token_ttl: Duration::from_secs(900),
        refresh_token_ttl: Duration::from_secs(604800),
    };

    // AEGIS
    use ataqu_infra_repositories::aegis_repo::AegisUserRepository;
    let aegis_repo = Arc::new(AegisUserRepository::new(pools.core.clone()));
    let aegis_outbox = Arc::new(ataqu_api::OutboxPlaceholder);
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
        CinqActivityRepository, CinqContactRepository, CinqDealRepository, CinqPipelineStageRepository,
    };
    let contact_repo = Arc::new(CinqContactRepository::new(pools.core.clone()));
    let deal_repo = Arc::new(CinqDealRepository::new(pools.core.clone()));
    let activity_repo = Arc::new(CinqActivityRepository::new(pools.core.clone()));
    let stage_repo = Arc::new(CinqPipelineStageRepository::new(pools.core.clone()));
    let cinq_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(pools.core.clone()));
    let cinq_service = Arc::new(CinqService::new(
        contact_repo,
        deal_repo,
        activity_repo,
        stage_repo,
        cinq_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // DIAL
    use ataqu_infra_repositories::dial_repo_impl::{DbPresenceStore, DialRepositoryImpl};
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
        PivotBlockRepository, PivotDatabaseRepository, PivotDocumentRepository, PivotRelationRepository,
    };
    let pivot_doc_repo = Arc::new(PivotDocumentRepository::new(pools.core.clone()));
    let pivot_db_repo = Arc::new(PivotDatabaseRepository::new(pools.core.clone()));
    let pivot_block_repo = Arc::new(PivotBlockRepository::new(pools.core.clone()));
    let pivot_rel_repo = Arc::new(PivotRelationRepository::new(pools.core.clone()));
    let pivot_service = Arc::new(PivotService::new(
        pivot_doc_repo,
        pivot_db_repo,
        pivot_block_repo,
        pivot_rel_repo,
        id_gen.clone(),
        clock.clone(),
    ));

    // SOND
    use ataqu_infra_repositories::sond_repo_impl::SondRepositoryImpl;
    let sond_repo = Arc::new(SondRepositoryImpl::new(pools.core.clone()));
    let sond_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(pools.core.clone()));
    let sond_service = Arc::new(SondService::new(sond_repo, sond_outbox, id_gen.clone(), clock.clone()));

    // VAULT
    use ataqu_infra_repositories::vault_repo_impl::VaultRepositoryImpl;
    let vault_repo = Arc::new(VaultRepositoryImpl::new(pools.core.clone()));
    let vault_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(pools.core.clone()));
    let vault_service = Arc::new(VaultService::new(vault_repo, vault_outbox, id_gen.clone(), clock.clone()));

    // VISTA
    use ataqu_infra_repositories::vista_repo_impl::VistaRepositoryImpl;
    let vista_repo = Arc::new(VistaRepositoryImpl::new(pools.core.clone()));
    let vista_service = Arc::new(VistaService::new(vista_repo, clock.clone()));

    // SPARK
    use ataqu_infra_repositories::spark_repo_impl::SparkRepositoryImpl;
    let spark_repo = Arc::new(SparkRepositoryImpl::new(pools.core.clone()));

    // SPARK Action Dispatcher
    use ataqu_application::spark_service::ActionDispatcher;
    use ataqu_domain_spark::Action;
    use ataqu_application::cinq_service::{CreateContactCommand, CreateActivityCommand};
    use ataqu_application::dial_service::{CreateChannelCommand, SendMessageCommand};
    use ataqu_application::vault_service::UpdateStockCommand;
    use ataqu_domain_cinq::activity::ActivityType;
    use ataqu_domain_dial::chat::ChannelType;
    use ataqu_security::{Email, PhoneNumber};

    struct AtaquActionDispatcher {
        dial_service: Arc<DialService>,
        cinq_service: Arc<CinqService>,
        vault_service: Arc<VaultService>,
    }

    #[async_trait::async_trait]
    impl ActionDispatcher for AtaquActionDispatcher {
        async fn dispatch(&self, action: &Action, tenant_id: &TenantId) -> Result<(), String> {
            match action {
                Action::CreateDialChannel { name, channel_type, participants } => {
                    let ct = match channel_type.as_str() {
                        "public" => ChannelType::Public,
                        "private" => ChannelType::Private,
                        "dm" => ChannelType::DirectMessage,
                        _ => ChannelType::Public,
                    };
                    self.dial_service.create_channel(CreateChannelCommand {
                        tenant_id: *tenant_id,
                        name: name.clone(),
                        channel_type: ct,
                        created_by: Uuid::nil(),
                        participants: participants.clone(),
                    }).await.map_err(|e| e.to_string())?;
                }
                Action::SendDialMessage { channel_id, content } => {
                    self.dial_service.send_message(SendMessageCommand {
                        tenant_id: *tenant_id,
                        channel_id: *channel_id,
                        thread_id: None,
                        author_id: Uuid::nil(),
                        content: content.clone(),
                    }).await.map_err(|e| e.to_string())?;
                }
                Action::CreateCinqContact { name, email, phone } => {
                    self.cinq_service.create_contact(CreateContactCommand {
                        tenant_id: *tenant_id,
                        name: name.clone(),
                        email: Email::new(email.clone()),
                        phone: phone.clone().map(PhoneNumber::new),
                        custom_fields: serde_json::Value::Null,
                    }).await.map_err(|e| e.to_string())?;
                }
                Action::CreateCinqActivity { contact_id, activity_type, description } => {
                    let act_type = match activity_type.as_str() {
                        "call" => ActivityType::Call,
                        "email" => ActivityType::Email,
                        "meeting" => ActivityType::Meeting,
                        "task" => ActivityType::Task,
                        _ => ActivityType::Note,
                    };
                    self.cinq_service.create_activity(CreateActivityCommand {
                        tenant_id: *tenant_id,
                        contact_id: *contact_id,
                        deal_id: None,
                        activity_type: act_type,
                        description: description.clone(),
                        scheduled_at: None,
                    }).await.map_err(|e| e.to_string())?;
                }
                Action::AdjustVaultStock { variant_id, delta, reason } => {
                    self.vault_service.update_stock(UpdateStockCommand {
                        tenant_id: *tenant_id,
                        variant_id: *variant_id,
                        delta: *delta,
                        reason: Some(reason.clone()),
                        reference: None,
                    }).await.map_err(|e| e.to_string())?;
                }
                _ => {
                    tracing::warn!("Action type not yet implemented natively: {:?}", action);
                }
            }
            Ok(())
        }
    }

    let action_dispatcher = Arc::new(AtaquActionDispatcher {
        dial_service: dial_service.clone(),
        cinq_service: cinq_service.clone(),
        vault_service: vault_service.clone(),
    });

    let spark_service = Arc::new(SparkService::new(spark_repo.clone(), action_dispatcher, id_gen.clone(), clock.clone()));

    // TEMPO
    use ataqu_infra_repositories::tempo_repo_impl::TempoRepositoryImpl;
    let tempo_repo = Arc::new(TempoRepositoryImpl::new(pools.core.clone()));
    let tempo_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(pools.core.clone()));
    let tempo_service = Arc::new(TempoService::new(tempo_repo, tempo_outbox, id_gen.clone(), clock.clone()));

    // PAUSE
    use ataqu_application::pause_infra::{RealIdempotency, RealOutbox};
    use ataqu_infra_repositories::pause_repo_impl::PauseRepositoryImpl;
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

    // Email tracking writer
    let (email_writer, email_tracking_tx) = ataqu_infra_repositories::email_tracking_writer::EmailTrackingWriter::new(
        pools.core.clone(),
        std::path::PathBuf::from("/tmp/ataqu_email_spill"),
        100 * 1024 * 1024,
    );
    tokio::spawn(async move {
        if let Err(e) = email_writer.run().await {
            tracing::error!("Email tracking writer crashed: {}", e);
        }
    });

    // Build AppState
    use dashmap::DashMap;
    let ws_registry = Arc::new(DashMap::new());
    let vista_service_for_outbox = vista_service.clone();
    let tempo_service_for_noshow = tempo_service.clone();
    let cinq_service_for_outbox = cinq_service.clone();
    let dial_service_for_outbox = dial_service.clone();
    let spark_service_for_outbox = spark_service.clone();
    let state = AppState {
        cinq_service,
        dial_service,
        pivot_service,
        sond_service,
        spark_service: spark_service.clone(),
        tempo_service,
        vault_service,
        vista_service,
        aegis_service,
        pause_service,
        jwt_secret,
        id_gen: id_gen.clone(),
        clock: clock.clone(),
        ws_registry,
        email_tracking_tx,
    };

    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([axum::http::Method::GET, axum::http::Method::POST, axum::http::Method::PUT, axum::http::Method::DELETE, axum::http::Method::PATCH])
        .allow_headers(tower_http::cors::Any);
    let app = create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    // Start outbox dispatcher in the background
    let dispatcher_pool = pools.dispatcher.clone();
    let spark_service_for_outbox = spark_service.clone();
    let handler = move |event: ataqu_infra_outbox::OutboxEvent| {
        let vista = vista_service_for_outbox.clone();
        let spark = spark_service_for_outbox.clone();
        let cinq = cinq_service_for_outbox.clone();
        let dial = dial_service_for_outbox.clone();
        async move {
            match event.schema.as_str() {
                "vista" | "core" => {
                    if let Err(e) = vista.process_event(&event).await {
                        tracing::error!(error = %e, "VISTA event processing failed");
                    }
                }
                "collab_crm" | "collab_ops" | "vault" | "dial" | "tempo" => {
                    if let Err(e) = vista.process_event(&event).await {
                        tracing::error!(error = %e, "CRM/OPS event -> VISTA failed");
                    }
                    if let Err(e) = spark.evaluate_trigger(&event).await {
                        tracing::error!(error = %e, "CRM/OPS event -> SPARK failed");
                    }

                    // Native cross-app integrations
                    match (event.schema.as_str(), event.event_type.as_str()) {
                        ("tempo", "BookingCreated") => {
                            let contact_id = event.payload.get("contact_id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
                            if let Some(cid) = contact_id {
                                let cmd = ataqu_application::cinq_service::CreateActivityCommand {
                                    tenant_id: ataqu_kernel::TenantId::new(event.aggregate_id.unwrap_or_default()),
                                    contact_id: cid,
                                    deal_id: None,
                                    activity_type: ataqu_domain_cinq::activity::ActivityType::Meeting,
                                    description: "Meeting booked via TEMPO".to_string(),
                                    scheduled_at: event.payload.get("starts_at").and_then(|v| v.as_str()).and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|dt| dt.with_timezone(&chrono::Utc)),
                                };
                                if let Err(e) = cinq.create_activity(cmd).await {
                                    tracing::error!(error = %e, "TEMPO -> CINQ activity creation failed");
                                }
                            }
                        }
                        ("sond", "ResponseSubmitted") => {
                            let email = event.payload.get("email").and_then(|v| v.as_str()).map(String::from);
                            let name = event.payload.get("name").and_then(|v| v.as_str()).map(String::from).unwrap_or_else(|| "Form Lead".to_string());
                            if let Some(em) = email {
                                let cmd = ataqu_application::cinq_service::CreateContactCommand {
                                    tenant_id: ataqu_kernel::TenantId::new(event.aggregate_id.unwrap_or_default()),
                                    name,
                                    email: ataqu_security::Email::new(em),
                                    phone: None,
                                    custom_fields: serde_json::Value::Null,
                                };
                                if let Err(e) = cinq.create_contact(cmd).await {
                                    tracing::error!(error = %e, "SOND -> CINQ contact creation failed");
                                }
                            }
                        }
                        ("vault", "LowStockAlert") => {
                            let variant_id = event.payload.get("variant_id").and_then(|v| v.as_str()).map(String::from);
                            let sku = event.payload.get("sku").and_then(|v| v.as_str()).map(String::from);
                            let channel_id = event.payload.get("alert_channel_id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());

                            if let (Some(v_id), Some(s), Some(c_id)) = (variant_id, sku, channel_id) {
                                let cmd = ataqu_application::dial_service::SendMessageCommand {
                                    tenant_id: ataqu_kernel::TenantId::new(event.aggregate_id.unwrap_or_default()),
                                    channel_id: c_id,
                                    thread_id: None,
                                    author_id: Uuid::nil(),
                                    content: format!("⚠️ Low Stock Alert: Variant {} (SKU: {}) is running low!", v_id, s),
                                };
                                if let Err(e) = dial.send_message(cmd).await {
                                    tracing::error!(error = %e, "VAULT -> DIAL alert failed");
                                }
                            }
                        }
                        _ => {}
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

    // Start no-show worker
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(300)).await;
            let tenant_id = TenantId::new(uuid::Uuid::nil()); // TODO: iterate real tenants
            match tempo_service_for_noshow.no_show_worker(tenant_id).await {
                Ok(updated) => {
                    if !updated.is_empty() {
                        tracing::info!("No-show worker marked {} bookings as no-show", updated.len());
                    }
                }
                Err(e) => {
                    tracing::error!("No-show worker error: {}", e);
                }
            }
        }
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
