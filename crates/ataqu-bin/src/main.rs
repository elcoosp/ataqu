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

// use ChangelogService;
// use HealthService;
// use OnboardingService;
// // 
// use ataqu_domain_aegis::repository::AuditRepositoryTrait;
use ataqu_infra_outbox::OutboxDispatcher;
use ataqu_infra_pools::Pools;




// use S3Service;
use sea_orm::{ConnectionTrait, TransactionTrait};

// Local stubs for missing dependencies (to be replaced with real implementations later)
pub trait AuditRepositoryTrait {}
pub struct DummyAuditRepo;
impl AuditRepositoryTrait for DummyAuditRepo {}
pub struct HealthService;
pub struct OnboardingService;
pub struct ChangelogService;
pub struct S3Service;



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

    use ataqu_infra_repositories::cinq_repo_impl::{
        CinqActivityRepository, CinqContactRepository, CinqDealRepository,
        CinqPipelineStageRepository, CinqTaskRepository,
    };
    let contact_repo = Arc::new(CinqContactRepository::new(pools.cinq.clone()));
    let deal_repo = Arc::new(CinqDealRepository::new(pools.cinq.clone()));
    let activity_repo = Arc::new(CinqActivityRepository::new(pools.cinq.clone()));
    let task_repo = Arc::new(CinqTaskRepository::new(pools.cinq.clone()));
    let stage_repo = Arc::new(CinqPipelineStageRepository::new(pools.cinq.clone()));
    let cinq_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.cinq.clone(),
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

    use ataqu_infra_repositories::dial_repo_impl::{DbPresenceStore, DialRepositoryImpl};
    let dial_repo = Arc::new(DialRepositoryImpl::new(pools.dial.clone()));
    let dial_presence = Arc::new(DbPresenceStore::new(pools.dial.clone()));
    let dial_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.dial.clone(),
    ));
    let dial_service = Arc::new(DialService::new(
        dial_repo,
        dial_presence,
        dial_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    use ataqu_infra_repositories::pivot_repo_impl::{
        PivotBlockRepository, PivotDatabaseRepository, PivotDocumentRepository,
        PivotRelationRepository,
    };
    let pivot_doc_repo = Arc::new(PivotDocumentRepository::new(pools.ops.clone()));
    let pivot_db_repo = Arc::new(PivotDatabaseRepository::new(pools.ops.clone()));
    let pivot_block_repo = Arc::new(PivotBlockRepository::new(pools.ops.clone()));
    let pivot_rel_repo = Arc::new(PivotRelationRepository::new(pools.ops.clone()));
    let pivot_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.ops.clone(),
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

    use ataqu_infra_repositories::sond_repo_impl::SondRepositoryImpl;
    let sond_repo = Arc::new(SondRepositoryImpl::new(pools.ops.clone()));
    let sond_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.ops.clone(),
    ));
    let sond_service = Arc::new(SondService::new(
        sond_repo,
        sond_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    use ataqu_infra_repositories::vault_repo_impl::VaultRepositoryImpl;
    let vault_repo = Arc::new(VaultRepositoryImpl::new(pools.vault.clone()));
    let vault_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.vault.clone(),
    ));
    let vault_service = Arc::new(VaultService::new(
        vault_repo,
        vault_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    use ataqu_infra_repositories::vista_repo_impl::VistaRepositoryImpl;
    let vista_repo = Arc::new(VistaRepositoryImpl::new(pools.vista.clone()));
    let vista_service = Arc::new(VistaService::new(vista_repo, clock.clone(), id_gen.clone()));

    use ataqu_infra_repositories::spark_repo_impl::SparkRepositoryImpl;
    let spark_repo = Arc::new(SparkRepositoryImpl::new(pools.spark.clone()));

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
        http_client: reqwest::Client,
        system_user_id: Uuid,
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
                            created_by: self.system_user_id,
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
                            author_id: self.system_user_id,
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
                            company: None,
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
                    let variant = self
                        .vault_service
                        .get_variant(*tenant_id, *variant_id)
                        .await
                        .map_err(|e| e.to_string())?;
                    self.vault_service
                        .update_stock(UpdateStockCommand {
                            tenant_id: *tenant_id,
                            variant_id: *variant_id,
                            delta: *delta,
                            reason: reason.clone(),
                            reference: None,
                            alert_channel_id: None,
                            expected_version: variant.version,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::ReserveVaultStock {
                    variant_id,
                    quantity,
                } => {
                    let variant = self
                        .vault_service
                        .get_variant(*tenant_id, *variant_id)
                        .await
                        .map_err(|e| e.to_string())?;
                    self.vault_service
                        .reserve_stock(*tenant_id, *variant_id, *quantity, variant.version)
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
                            company: None,
                            email: Email::new(email.clone()),
                            phone: None,
                            custom_fields: serde_json::json!({ "source": source }),
                            lead_score: None,
                        })
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::Webhook {
                    url,
                    method,
                    body,
                    headers,
                } => {
                    // [VULN-003] SSRF Protection with DNS Rebinding mitigation
                    let parsed_url = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
                    let host = parsed_url.host_str().ok_or("Invalid URL")?.to_string();
                    let port = parsed_url.port_or_known_default().unwrap_or(80);

                    // Resolve DNS and take the first IP address
                    let mut addrs = tokio::net::lookup_host((host.as_str(), port))
                        .await
                        .map_err(|e| e.to_string())?;
                    let addr = addrs.next().ok_or("DNS resolution failed")?;
                    let ip = addr.ip();

                    let is_blocked = match ip {
                        std::net::IpAddr::V4(v4) => {
                            v4.is_loopback()
                                || v4.is_private()
                                || v4.is_link_local()
                                || v4.is_unspecified()
                                || v4.is_broadcast()
                                || v4.is_documentation()
                        }
                        std::net::IpAddr::V6(v6) => v6.is_loopback() || v6.is_unspecified(),
                    };
                    if is_blocked {
                        return Err(format!("SSRF attempt blocked: internal IP ({})", ip));
                    }

                    // Rebuild URL with the resolved IP to prevent DNS rebinding
                    let mut new_url = parsed_url.clone();
                    new_url
                        .set_host(Some(&ip.to_string()))
                        .map_err(|e| e.to_string())?;

                    let mut req = match method.to_uppercase().as_str() {
                        "POST" => self.http_client.post(new_url),
                        "PUT" => self.http_client.put(new_url),
                        "PATCH" => self.http_client.patch(new_url),
                        "DELETE" => self.http_client.delete(new_url),
                        _ => self.http_client.get(new_url),
                    };

                    // Set Host header to original host
                    req = req.header("host", &host);

                    for (k, v) in headers {
                        if k.eq_ignore_ascii_case("host") {
                            continue;
                        }
                        req = req.header(k, v);
                    }
                    req = req.json(&body);
                    req.send().await.map_err(|e| e.to_string())?;
                }
                _ => {
                    tracing::warn!("Action type not yet implemented natively: {:?}", action);
                }
            }
            Ok(())
        }
    }

    let system_user_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    if let Err(e) = aegis_service.ensure_system_user(system_user_id).await {
        tracing::warn!(error = %e, "Failed to ensure system user exists");
    }

    let action_dispatcher = Arc::new(AtaquActionDispatcher {
        dial_service: dial_service.clone(),
        cinq_service: cinq_service.clone(),
        vault_service: vault_service.clone(),
        http_client: reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .unwrap_or_else(|_| reqwest::Client::new()),
        system_user_id,
    });

    let spark_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let spark_service = Arc::new(SparkService::new(
        spark_repo.clone(),
        action_dispatcher,
        spark_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    use ataqu_infra_repositories::tempo_repo_impl::TempoRepositoryImpl;
    let tempo_repo = Arc::new(TempoRepositoryImpl::new(pools.ops.clone()));
    let tempo_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.ops.clone(),
    ));
    let tempo_service = Arc::new(TempoService::new(
        tempo_repo,
        tempo_outbox,
        id_gen.clone(),
        clock.clone(),
    ));

    use ataqu_application::pause_infra::RealIdempotency;
    use ataqu_infra_repositories::pause_repo_impl::PauseRepositoryImpl;
    let pause_idempotency = Arc::new(RealIdempotency::new(pools.ops.clone()));
    let pause_employee_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_leave_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_doc_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.ops.clone(),
    ));
    let pause_service = Arc::new(PauseService::new(
        pause_idempotency,
        pause_employee_repo,
        pause_leave_repo,
        pause_doc_repo,
        pause_outbox,
        clock.clone(),
    ));

    let (email_writer, email_tracking_tx) =
        ataqu_infra_repositories::email_tracking_writer::EmailTrackingWriter::new(
            pools.ops.clone(),
            std::path::PathBuf::from("/tmp/ataqu_email_spill"),
            10 * 1024 * 1024,
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

    let metrics_handle = metrics_exporter_prometheus::PrometheusBuilder::new()
        .install_recorder()
        .expect("failed to install Prometheus recorder");

    use dashmap::DashMap;
    let ws_registry = Arc::new(DashMap::new());
    let conn_index = Arc::new(DashMap::new());
    let presence_counts = Arc::new(DashMap::new());
    let sso_states = Arc::new(
        moka::sync::Cache::builder()
            .time_to_live(Duration::from_secs(600))
            .build(),
    );
    let rate_limiter =
        ataqu_api::middleware::rate_limit::RateLimiter::new(100, Duration::from_secs(60));
    let http_client = reqwest::Client::new();

    let rate_limiter_cleanup = rate_limiter.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            rate_limiter_cleanup.cleanup();
        }
    });
    let vista_service_for_outbox = vista_service.clone();
    let tempo_service_for_noshow = tempo_service.clone();
    let aegis_service_for_admin = aegis_service.clone();
    let vault_service_for_reaper = vault_service.clone();

    // Health Stubs
    let health_service =
        Arc::new(HealthService);
    let health_cache = Arc::new(moka::sync::Cache::<(), ()>::builder().build());

    // Audit Stub
    let audit_repo: Arc<dyn AuditRepositoryTrait + Send + Sync> =
        Arc::new(DummyAuditRepo);

    // S3 Stub
    let s3_service =
        Arc::new(S3Service);

    // Idempotency Stub
    let idempotency_guard = pause_idempotency.clone();

    // Onboarding & Changelog Stubs
    let onboarding_service =
        Arc::new(OnboardingService);
    let changelog_service = Arc::new(ChangelogService,
    ));

    let state = AppState {
        db: pools.core.clone(),
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
        conn_index,
        presence_counts,
        email_tracking_tx,
        rate_limiter,
        metrics_handle,
        sso_states: sso_states.clone(),
        http_client,

        health_service: health_service.clone(),
        health_cache: health_cache.clone(),
        audit_repo: audit_repo.clone(),
        s3_service: s3_service.clone(),
        idempotency_guard: idempotency_guard.clone(),
        onboarding_service: onboarding_service.clone(),
        changelog_service: changelog_service.clone(),
    };

    // [MED-001] Restrict CORS origins
    let allowed_origins =
        std::env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let origins: Vec<axum::http::HeaderValue> = allowed_origins
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(origins)
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

    let dispatcher_pool = pools.dispatcher.clone();
    let gdpr_registry = Arc::new(ataqu_domain_gdpr::GdprRegistry::new());
    let gdpr_db_pool = pools.core.clone();
    tokio::spawn(async move {
        loop {
            let vista = vista_service_for_outbox.clone();
            let spark = spark_service.clone();
            let gdpr_registry = gdpr_registry.clone();
            let gdpr_db_pool = gdpr_db_pool.clone();
            let handler = move |event: ataqu_infra_outbox::OutboxEvent| {
                let vista = vista.clone();
                let spark = spark.clone();
                let gdpr_registry = gdpr_registry.clone();
                let gdpr_db_pool = gdpr_db_pool.clone();
                async move {
                    if let Err(e) = vista.process_event(&event).await {
                        tracing::error!(error = %e, "VISTA event processing failed");
                        return Err(ataqu_infra_outbox::DispatcherError::Handler(e.to_string()));
                    }
                    if let Err(e) = spark.evaluate_trigger(&event).await {
                        tracing::error!(error = %e, "SPARK trigger evaluation failed");
                        return Err(ataqu_infra_outbox::DispatcherError::Handler(e.to_string()));
                    }

                    if event.schema == "core" && event.event_type == "GdprDeletionRequested" {
                        if let Some(tenant_id_str) =
                            event.payload.get("tenant_id").and_then(|v| v.as_str())
                        {
                            if let Ok(tenant_uuid) = Uuid::parse_str(tenant_id_str) {
                                tracing::info!(tenant_id = %tenant_uuid, "Processing GDPR deletion");
                                let txn = match gdpr_db_pool.begin().await {
                                    Ok(t) => t,
                                    Err(e) => {
                                        tracing::error!(error = %e, "Failed to begin GDPR transaction");
                                        return Err(ataqu_infra_outbox::DispatcherError::Handler(
                                            e.to_string(),
                                        ));
                                    }
                                };
                                for table in gdpr_registry.tables.iter() {
                                    let sql = format!(
                                        "DELETE FROM {}.{} WHERE {} = $1",
                                        table.schema, table.table, table.tenant_id_column
                                    );
                                    let stmt = sea_orm::Statement::from_sql_and_values(
                                        sea_orm::DbBackend::Postgres,
                                        &sql,
                                        [tenant_uuid.into()],
                                    );
                                    if let Err(e) = txn.execute_raw(stmt).await {
                                        tracing::error!(table = %table.table, error = %e, "Failed to delete data for GDPR");
                                        let _ = txn.rollback().await;
                                        return Err(ataqu_infra_outbox::DispatcherError::Handler(
                                            e.to_string(),
                                        ));
                                    }
                                }
                                if let Err(e) = txn.commit().await {
                                    tracing::error!(error = %e, "Failed to commit GDPR transaction");
                                    return Err(ataqu_infra_outbox::DispatcherError::Handler(
                                        e.to_string(),
                                    ));
                                }
                            }
                        }
                    }

                    if event.schema == "core" && event.event_type == "PasswordResetRequested" {
                        let recipient = event
                            .payload
                            .get("email")
                            .and_then(|v| v.as_str())
                            .unwrap_or("noreply@ataqu.com");
                        let token = event
                            .payload
                            .get("token")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");

                        use lettre::{
                            Message, SmtpTransport, Transport, message::header::ContentType,
                            transport::smtp::authentication::Credentials,
                        };

                        let email = Message::builder()
                            .from("Ataqu Security <noreply@ataqu.com>".parse().unwrap())
                            .to(recipient
                                .parse()
                                .unwrap_or("noreply@ataqu.com".parse().unwrap()))
                            .subject("Password Reset Request")
                            .header(ContentType::TEXT_PLAIN)
                            .body(format!(
                                "You requested a password reset. Use the following token: {}",
                                token
                            ))
                            .unwrap();

                        let smtp_host =
                            std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
                        let smtp_port: u16 = std::env::var("SMTP_PORT")
                            .unwrap_or_else(|_| "1025".to_string())
                            .parse()
                            .unwrap_or(1025);
                        let smtp_user = std::env::var("SMTP_USER").ok();
                        let smtp_pass = std::env::var("SMTP_PASS").ok();

                        let mailer = SmtpTransport::relay(&smtp_host)
                            .map(|builder| {
                                let builder = builder.port(smtp_port);
                                if let (Some(u), Some(p)) = (smtp_user.as_ref(), smtp_pass.as_ref())
                                {
                                    builder
                                        .credentials(Credentials::new(u.clone(), p.clone()))
                                        .build()
                                } else {
                                    builder.build()
                                }
                            })
                            .unwrap_or_else(|_| SmtpTransport::unencrypted_localhost());

                        let mailer_clone = mailer.clone();
                        let email_clone = email.clone();
                        let recipient_clone = recipient.to_string();
                        tokio::task::spawn_blocking(move || {
                            if let Err(e) = mailer_clone.send(&email_clone) {
                                tracing::error!("Failed to send password reset email: {}", e);
                            } else {
                                tracing::info!("Password reset email sent for {}", recipient_clone);
                            }
                        })
                        .await
                        .ok();
                    }

                    if event.schema == "collab_ops" && event.event_type == "SendBookingReminder" {
                        let booking_id = event
                            .payload
                            .get("booking_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let starts_at = event
                            .payload
                            .get("starts_at")
                            .and_then(|v| v.as_str())
                            .unwrap_or("soon");
                        let recipient = event
                            .payload
                            .get("email")
                            .and_then(|v| v.as_str())
                            .unwrap_or("noreply@ataqu.com");

                        use lettre::{
                            Message, SmtpTransport, Transport, message::header::ContentType,
                            transport::smtp::authentication::Credentials,
                        };

                        let email = Message::builder()
                            .from("Ataqu Scheduling <noreply@ataqu.com>".parse().unwrap())
                            .to(recipient
                                .parse()
                                .unwrap_or("user@example.com".parse().unwrap()))
                            .subject("Booking Reminder")
                            .header(ContentType::TEXT_PLAIN)
                            .body(format!(
                                "Your booking {} is starting at {}.",
                                booking_id, starts_at
                            ))
                            .unwrap();

                        let smtp_host =
                            std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
                        let smtp_port: u16 = std::env::var("SMTP_PORT")
                            .unwrap_or_else(|_| "1025".to_string())
                            .parse()
                            .unwrap_or(1025);
                        let smtp_user = std::env::var("SMTP_USER").ok();
                        let smtp_pass = std::env::var("SMTP_PASS").ok();

                        let mailer = SmtpTransport::relay(&smtp_host)
                            .map(|builder| {
                                let builder = builder.port(smtp_port);
                                if let (Some(u), Some(p)) = (smtp_user.as_ref(), smtp_pass.as_ref())
                                {
                                    builder
                                        .credentials(Credentials::new(u.clone(), p.clone()))
                                        .build()
                                } else {
                                    builder.build()
                                }
                            })
                            .unwrap_or_else(|_| SmtpTransport::unencrypted_localhost());

                        let mailer_clone = mailer.clone();
                        let email_clone = email.clone();
                        let booking_id_clone = booking_id.to_string();
                        tokio::task::spawn_blocking(move || {
                            if let Err(e) = mailer_clone.send(&email_clone) {
                                tracing::error!("Failed to send booking reminder email: {}", e);
                            } else {
                                tracing::info!(
                                    "Booking reminder email sent for {}",
                                    booking_id_clone
                                );
                            }
                        })
                        .await
                        .ok();
                    }

                    if event.schema == "collab_ops" && event.event_type == "TempoBookingCreatedV1" {
                        if let Err(e) = cinq_service
                            .process_tempo_booking_event(&event.payload)
                            .await
                        {
                            tracing::error!(error = %e, "Failed to process TEMPO booking event");
                            return Err(ataqu_infra_outbox::DispatcherError::Handler(
                                e.to_string(),
                            ));
                        }
                    }

                    Ok(())
                }
            };
            let dispatcher = OutboxDispatcher::new(dispatcher_pool.clone(), handler);
            #[allow(unreachable_code)]
            {
                dispatcher.run().await;
                tracing::error!("Outbox dispatcher stopped. Restarting in 5s...");
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    });

    tokio::spawn(async move {
        loop {
            if let Err(e) = spark_service_for_cron.poll_scheduled_triggers().await {
                tracing::error!("Cron worker crashed: {}. Restarting in 5s...", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    tokio::spawn(async move {
        loop {
            let tenants = aegis_service_for_noshow
                .list_tenants()
                .await
                .unwrap_or_default();
            let mut set = tokio::task::JoinSet::new();
            for tid in tenants {
                let tempo_service = tempo_service_for_noshow.clone();
                set.spawn(async move {
                    let tenant_id = TenantId::new(tid);
                    if let Err(e) = tempo_service.no_show_worker(tenant_id).await {
                        tracing::error!("No-show worker crashed for tenant {}: {}.", tid, e);
                    }
                });
            }
            while let Some(_) = set.join_next().await {}
            tokio::time::sleep(Duration::from_secs(300)).await;
        }
    });

    tokio::spawn(async move {
        loop {
            let tenants = aegis_service_for_reminder
                .list_tenants()
                .await
                .unwrap_or_default();
            let mut set = tokio::task::JoinSet::new();
            for tid in tenants {
                let tempo_service = tempo_service_for_reminder.clone();
                set.spawn(async move {
                    let tenant_id = TenantId::new(tid);
                    if let Err(e) = tempo_service.reminder_worker(tenant_id).await {
                        tracing::error!("Reminder worker crashed for tenant {}: {}.", tid, e);
                    }
                });
            }
            while let Some(_) = set.join_next().await {}
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    tokio::spawn(async move {
        loop {
            if let Err(e) = vault_service_for_reaper.reap_expired_reservations().await {
                tracing::error!("Reservation reaper crashed: {}. Restarting in 5s...", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });

    let admin_socket_path = "/tmp/ataqu-admin.sock";
    let _ = std::fs::remove_file(admin_socket_path);
    let admin_listener = tokio::net::UnixListener::bind(admin_socket_path)?;
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(admin_socket_path, std::fs::Permissions::from_mode(0o600))?;
    let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();
    let _id_gen_for_admin = id_gen.clone();
    let _clock_for_admin = clock.clone();

    tokio::spawn(async move {
        tracing::info!("Admin server listening on UDS: {}", admin_socket_path);
        loop {
            if let Ok((mut stream, _)) = admin_listener.accept().await {
                let admin_token = admin_token.clone();
                let aegis = aegis_service_for_admin.clone();

                tokio::spawn(async move {
                    use tokio::io::{AsyncReadExt, AsyncWriteExt};
                    let mut buffer = [0; 1024];
                    if let Ok(bytes_read) = stream.read(&mut buffer).await {
                        let command = String::from_utf8_lossy(&buffer[..bytes_read]).to_string();
                        tracing::info!("Received admin command: {}", command);

                        if admin_token.is_empty() || !command.starts_with(&admin_token) {
                            tracing::warn!("Unauthorized admin command attempt");
                            let _ = stream.write_all(b"Unauthorized\n").await;
                            return;
                        }

                        let actual_cmd = command[admin_token.len()..].trim();
                        tracing::info!(command = actual_cmd, "Authorized admin command");

                        let response = match actual_cmd {
                            "ping" => "pong\n".to_string(),
                            "flush_cache" => {
                                ataqu_api::middleware::idempotency::flush_idempotency_cache();
                                "OK\n".to_string()
                            }
                            "list_tenants" => match aegis.list_tenants().await {
                                Ok(tenants) => {
                                    let tenants: Vec<String> =
                                        tenants.iter().map(|u| u.to_string()).collect();
                                    format!("{}\n", tenants.join("\n"))
                                }
                                Err(e) => format!("Error: {}\n", e),
                            },
                            _ => "Unknown command\n".to_string(),
                        };

                        let _ = stream.write_all(response.as_bytes()).await;
                    }
                });
            }
        }
    });

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