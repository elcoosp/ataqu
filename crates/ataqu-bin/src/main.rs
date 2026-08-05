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
use tracing_appender::non_blocking;
use tracing_appender::rolling;
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
use ataqu_kernel::{SystemClock, SystemIdGenerator, TenantId};

use ataqu_infra_outbox::OutboxDispatcher;
use ataqu_infra_pools::Pools;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let file_appender = rolling::daily("./logs", "ataqu.log");
    let (non_blocking_file, _guard) = non_blocking(file_appender);

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(true)
        .with_writer(non_blocking_file)
        .init();

    info!("Starting Ataqu unified server...");

    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@127.0.0.1:5433/ataqu".to_string());

    let pools = Pools::new(&db_url).await?;

    let id_gen = Arc::new(SystemIdGenerator);
    let clock = Arc::new(SystemClock);

    let jwt_secret_raw = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set")
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
    let aegis_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
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
        CinqActivityRepository, CinqContactRepository, CinqDealRepository,
        CinqPipelineStageRepository, CinqTaskRepository,
    };
    let contact_repo = Arc::new(CinqContactRepository::new(pools.core.clone()));
    let deal_repo = Arc::new(CinqDealRepository::new(pools.core.clone()));
    let activity_repo = Arc::new(CinqActivityRepository::new(pools.core.clone()));
    let task_repo = Arc::new(CinqTaskRepository::new(pools.core.clone()));
    let stage_repo = Arc::new(CinqPipelineStageRepository::new(pools.core.clone()));
    let cinq_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let cinq_service = Arc::new(CinqService::new(
        contact_repo,
        deal_repo,
        activity_repo,
        task_repo,
        stage_repo,
        cinq_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // DIAL
    use ataqu_infra_repositories::dial_repo_impl::{DbPresenceStore, DialRepositoryImpl};
    let dial_repo = Arc::new(DialRepositoryImpl::new(pools.core.clone()));
    let dial_presence = Arc::new(DbPresenceStore::new(pools.core.clone()));
    let dial_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let dial_service = Arc::new(DialService::new(
        dial_repo,
        dial_presence,
        dial_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // PIVOT
    use ataqu_infra_repositories::pivot_repo_impl::{
        PivotBlockRepository, PivotDatabaseRepository, PivotDocumentRepository,
        PivotRelationRepository,
    };
    let pivot_doc_repo = Arc::new(PivotDocumentRepository::new(pools.core.clone()));
    let pivot_db_repo = Arc::new(PivotDatabaseRepository::new(pools.core.clone()));
    let pivot_block_repo = Arc::new(PivotBlockRepository::new(pools.core.clone()));
    let pivot_rel_repo = Arc::new(PivotRelationRepository::new(pools.core.clone()));
    let pivot_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let pivot_service = Arc::new(PivotService::new(
        pivot_doc_repo,
        pivot_db_repo,
        pivot_block_repo,
        pivot_rel_repo,
        pivot_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // SOND
    use ataqu_infra_repositories::sond_repo_impl::SondRepositoryImpl;
    let sond_repo = Arc::new(SondRepositoryImpl::new(pools.core.clone()));
    let sond_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let sond_service = Arc::new(SondService::new(
        sond_repo,
        sond_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // VAULT
    use ataqu_infra_repositories::vault_repo_impl::VaultRepositoryImpl;
    let vault_repo = Arc::new(VaultRepositoryImpl::new(pools.core.clone()));
    let vault_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let vault_service = Arc::new(VaultService::new(
        vault_repo,
        vault_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // VISTA
    use ataqu_infra_repositories::vista_repo_impl::VistaRepositoryImpl;
    let vista_repo = Arc::new(VistaRepositoryImpl::new(pools.core.clone()));
    let vista_service = Arc::new(VistaService::new(vista_repo, clock.clone()));

    // SPARK
    use ataqu_infra_repositories::spark_repo_impl::SparkRepositoryImpl;
    let spark_repo = Arc::new(SparkRepositoryImpl::new(pools.core.clone()));

    // SPARK Action Dispatcher
    use ataqu_application::cinq_service::{CreateActivityCommand, CreateContactCommand};
    use ataqu_application::dial_service::{CreateChannelCommand, SendMessageCommand};
    use ataqu_application::spark_service::ActionDispatcher;
    use ataqu_application::vault_service::UpdateStockCommand;
    use ataqu_domain_cinq::activity::ActivityType;
    use ataqu_domain_dial::chat::ChannelType;
    use ataqu_domain_spark::Action;
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
                Action::CreateDialChannel {
                    name,
                    channel_type,
                    participants,
                } => {
                    let ct = match channel_type.as_str() {
                        "public" => ChannelType::Public,
                        "private" => ChannelType::Private,
                        "dm" => ChannelType::DirectMessage,
                        _ => ChannelType::Public,
                    };
                    self.dial_service
                        .create_channel(CreateChannelCommand {
                            tenant_id: *tenant_id,
                            name: name.clone(),
                            channel_type: ct,
                            created_by: Uuid::nil(),
                            participants: participants.clone(),
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::SendDialMessage {
                    channel_id,
                    content,
                } => {
                    self.dial_service
                        .send_message(SendMessageCommand {
                            tenant_id: *tenant_id,
                            channel_id: *channel_id,
                            thread_id: None,
                            author_id: Uuid::nil(),
                            content: content.clone(),
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::CreateCinqContact { name, email, phone } => {
                    self.cinq_service
                        .create_contact(CreateContactCommand {
                            tenant_id: *tenant_id,
                            name: name.clone(),
                            email: Email::new(email.clone()),
                            phone: phone.clone().map(PhoneNumber::new),
                            custom_fields: serde_json::Value::Null,
                            lead_score: None,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::CreateCinqActivity {
                    contact_id,
                    activity_type,
                    description,
                } => {
                    let act_type = match activity_type.as_str() {
                        "call" => ActivityType::Call,
                        "email" => ActivityType::Email,
                        "meeting" => ActivityType::Meeting,
                        "task" => ActivityType::Task,
                        _ => ActivityType::Note,
                    };
                    self.cinq_service
                        .create_activity(CreateActivityCommand {
                            tenant_id: *tenant_id,
                            contact_id: *contact_id,
                            deal_id: None,
                            activity_type: act_type,
                            description: description.clone(),
                            scheduled_at: None,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::AdjustVaultStock {
                    variant_id,
                    delta,
                    reason,
                } => {
                    self.vault_service
                        .update_stock(UpdateStockCommand {
                            tenant_id: *tenant_id,
                            variant_id: *variant_id,
                            delta: *delta,
                            reason: reason.clone(),
                            reference: None,
                            alert_channel_id: None,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::ReserveVaultStock {
                    variant_id,
                    quantity,
                } => {
                    self.vault_service
                        .reserve_stock(*tenant_id, *variant_id, *quantity)
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::CreateCinqLead {
                    name,
                    email,
                    source,
                } => {
                    self.cinq_service
                        .create_contact(CreateContactCommand {
                            tenant_id: *tenant_id,
                            name: name.clone(),
                            email: Email::new(email.clone()),
                            phone: None,
                            custom_fields: serde_json::json!({ "source": source }),
                            lead_score: None,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
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

    let spark_service = Arc::new(SparkService::new(
        spark_repo.clone(),
        action_dispatcher,
        id_gen.clone(),
        clock.clone(),
    ));

    // TEMPO
    use ataqu_infra_repositories::tempo_repo_impl::TempoRepositoryImpl;
    let tempo_repo = Arc::new(TempoRepositoryImpl::new(pools.core.clone()));
    let tempo_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let tempo_service = Arc::new(TempoService::new(
        tempo_repo,
        tempo_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    // PAUSE
    use ataqu_application::pause_infra::RealIdempotency;
    use ataqu_infra_repositories::pause_repo_impl::PauseRepositoryImpl;
    let pause_idempotency = Arc::new(RealIdempotency::new(pools.core.clone()));
    let pause_employee_repo = Arc::new(PauseRepositoryImpl::new(pools.core.clone()));
    let pause_leave_repo = Arc::new(PauseRepositoryImpl::new(pools.core.clone()));
    let pause_doc_repo = Arc::new(PauseRepositoryImpl::new(pools.core.clone()));
    let pause_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(pools.core.clone()));
    let pause_service = Arc::new(PauseService::new(
        pause_idempotency,
        pause_employee_repo,
        pause_leave_repo,
        pause_doc_repo,
        pause_outbox,
    ));

    // Email tracking writer
    let (email_writer, email_tracking_tx) =
        ataqu_infra_repositories::email_tracking_writer::EmailTrackingWriter::new(
            pools.core.clone(),
            std::path::PathBuf::from("/tmp/ataqu_email_spill"),
            100 * 1024 * 1024,
        );
    tokio::spawn(async move {
        if let Err(e) = email_writer.run().await {
            tracing::error!("Email tracking writer crashed: {}", e);
        }
    });

    let tempo_service_for_reminder = tempo_service.clone();
    let aegis_service_for_noshow = aegis_service.clone();
    let aegis_service_for_reminder = aegis_service.clone();
    let spark_service_for_cron = spark_service.clone();
    // let _spark_service_for_outbox = spark_service.clone();

    let metrics_handle = metrics_exporter_prometheus::PrometheusBuilder::new()
        .install_recorder()
        .expect("failed to install Prometheus recorder");

    // Build AppState
    use dashmap::DashMap;
    let ws_registry = Arc::new(DashMap::new());
    let rate_limiter =
        ataqu_api::middleware::rate_limit::RateLimiter::new(100, Duration::from_secs(60));
    let vista_service_for_outbox = vista_service.clone();
    let tempo_service_for_noshow = tempo_service.clone();
    let cinq_service_for_outbox = cinq_service.clone();
    let vault_service_for_outbox = vault_service.clone();
    let dial_service_for_outbox = dial_service.clone();
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
        rate_limiter,
        metrics_handle,
    };

    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::PATCH,
        ])
        .allow_headers(tower_http::cors::Any);
    let app = create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    // Start outbox dispatcher in the background
    let dispatcher_pool = pools.dispatcher.clone();
    let handler = move |event: ataqu_infra_outbox::OutboxEvent| {
        let vista = vista_service_for_outbox.clone();
        let spark = spark_service.clone();
        async move {
            if let Err(e) = vista.process_event(&event).await {
                tracing::error!(error = %e, "VISTA event processing failed");
            }
            if let Err(e) = spark.evaluate_trigger(&event).await {
                tracing::error!(error = %e, "SPARK trigger evaluation failed");
            }
            Ok(())
        }
    };
    let dispatcher = OutboxDispatcher::new(dispatcher_pool, handler);
    tokio::spawn(async move {
        dispatcher.run().await;
    });

    // Start cron worker
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            if let Err(e) = spark_service_for_cron.poll_scheduled_triggers().await {
                tracing::error!("Cron worker error: {}", e);
            }
        }
    });

    // Start no-show worker
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(300)).await;
            let tenants = aegis_service_for_noshow
                .list_tenants()
                .await
                .unwrap_or_default();
            for tid in tenants {
                let tenant_id = TenantId::new(tid);
                if let Err(e) = tempo_service_for_noshow.no_show_worker(tenant_id).await {
                    tracing::error!("No-show worker error for tenant {}: {}", tid, e);
                }
            }
        }
    });

    // Start reminder worker
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            let tenants = aegis_service_for_reminder
                .list_tenants()
                .await
                .unwrap_or_default();
            for tid in tenants {
                let tenant_id = TenantId::new(tid);
                if let Err(e) = tempo_service_for_reminder.reminder_worker(tenant_id).await {
                    tracing::error!("Reminder worker error for tenant {}: {}", tid, e);
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
