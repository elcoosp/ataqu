#![allow(clippy::never_loop)]

//! Ataqu unified server entry point.
//! Starts the Axum HTTP server, runs the outbox dispatcher in the background,
//! and sets up idempotency middleware.
mod event_registry;
use ataqu_api::{AppState, create_router};
use ataqu_application::aegis_service::{AegisConfig, AegisService, RealAegisDomain};
use ataqu_application::changelog_service::ChangelogService;
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::health_service::HealthService;
use ataqu_application::onboarding_service::OnboardingService;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::shopify_service::ShopifyService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;
use ataqu_domain_aegis::repository::AuditRepositoryTrait;
use ataqu_infra_pools::Pools;
use ataqu_infra_repositories::cinq_repo_impl::CinqEstablishmentRepository;
use ataqu_infra_repositories::shopify_repo_impl::ShopifyRepositoryImpl;
use ataqu_infra_storage::s3_service::S3Service;
use ataqu_kernel::{SystemClock, SystemIdGenerator};
use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tracing::info;
use tracing_appender::non_blocking;
use tracing_appender::rolling;
use tracing_subscriber::EnvFilter;
use uuid::Uuid;
// use sea_orm::DatabaseConnection;
// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
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
    let pools = std::sync::Arc::new(Pools::new(&db_url).await?);
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
    let audit_repo = Arc::new(ataqu_infra_repositories::audit_repo::AuditRepository::new(
        pools.core.clone(),
    ));
    // Clone the outbox for use in GDPR runner (since aegis_outbox is moved into AegisService)
    let core_outbox_for_gdpr = aegis_outbox.clone();
    let aegis_service = Arc::new(AegisService::new(
        aegis_repo,
        aegis_outbox,
        aegis_domain,
        audit_repo.clone(),
        id_gen.clone(),
        clock.clone(),
        aegis_config,
    ));
    // CINQ
    use ataqu_infra_repositories::cinq_repo_impl::{
        CinqActivityRepository, CinqContactRepository, CinqDealRepository,
        CinqPipelineStageRepository, CinqTaskRepository,
    };
    let contact_repo = Arc::new(CinqContactRepository::new(pools.cinq.clone()));
    let deal_repo = Arc::new(CinqDealRepository::new(pools.cinq.clone()));
    let activity_repo = Arc::new(CinqActivityRepository::new(pools.cinq.clone()));
    let task_repo = Arc::new(CinqTaskRepository::new(pools.cinq.clone()));
    let stage_repo = Arc::new(CinqPipelineStageRepository::new(pools.cinq.clone()));
    let establishment_repo = Arc::new(CinqEstablishmentRepository::new(pools.cinq.clone()));
    let cinq_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.cinq.clone(),
    ));
    let cinq_service = Arc::new(CinqService::new(
        pools.cinq.clone(),
        contact_repo,
        deal_repo,
        activity_repo,
        task_repo,
        stage_repo,
        establishment_repo,
        cinq_outbox,
        id_gen.clone(),
        clock.clone(),
        Some(audit_repo.clone()),
    ));
    // DIAL
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
        Some(audit_repo.clone()),
    ));
    // PIVOT
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
        Some(audit_repo.clone()),
    ));
    // SOND
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
        Some(audit_repo.clone()),
    ));

    // VAULT
    use ataqu_infra_repositories::vault_repo_impl::VaultRepositoryImpl;
    let vault_repo = Arc::new(VaultRepositoryImpl::new(pools.vault.clone()));
    let vault_txn_repo = vault_repo.clone();
    let vault_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.vault.clone(),
    ));
    let vault_service = Arc::new(VaultService::new(
        vault_repo,
        vault_txn_repo,
        pools.vault.clone(),
        vault_outbox,
        id_gen.clone(),
        clock.clone(),
        Some(audit_repo.clone()),
    ));
    // VISTA
    use ataqu_infra_repositories::vista_repo_impl::VistaRepositoryImpl;
    let vista_repo = Arc::new(VistaRepositoryImpl::new(pools.vista.clone()));
    let vista_service = Arc::new(VistaService::new(
        vista_repo,
        pools.vista.clone(),
        clock.clone(),
        id_gen.clone(),
    ));
    // SPARK
    use ataqu_infra_repositories::spark_repo_impl::SparkRepositoryImpl;
    let spark_repo = Arc::new(SparkRepositoryImpl::new(pools.spark.clone()));
    // Action dispatcher for SPARK
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
        system_user_id: Uuid,
    }
    #[async_trait::async_trait]
    impl ActionDispatcher for AtaquActionDispatcher {
        async fn dispatch(
            &self,
            action: &Action,
            tenant_id: &ataqu_kernel::TenantId,
        ) -> Result<(), String> {
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
                        .create_channel(
                            self.system_user_id,
                            CreateChannelCommand {
                                tenant_id: *tenant_id,
                                name: name.clone(),
                                channel_type: ct,
                                created_by: self.system_user_id,
                                participants: participants.clone(),
                            },
                        )
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
                        .create_contact(
                            self.system_user_id,
                            CreateContactCommand {
                                tenant_id: *tenant_id,
                                name: name.clone(),
                                company: None,
                                email: Email::new(email.clone()),
                                phone: phone.clone().map(PhoneNumber::new),
                                custom_fields: serde_json::Value::Null,
                                lead_score: None,
                            },
                        )
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
                        .create_activity(
                            self.system_user_id,
                            CreateActivityCommand {
                                tenant_id: *tenant_id,
                                contact_id: *contact_id,
                                deal_id: None,
                                activity_type: act_type,
                                description: description.clone(),
                                scheduled_at: None,
                            },
                        )
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
                        .update_stock(
                            self.system_user_id,
                            UpdateStockCommand {
                                tenant_id: *tenant_id,
                                variant_id: *variant_id,
                                delta: *delta,
                                reason: reason.clone(),
                                reference: None,
                                alert_channel_id: None,
                                expected_version: variant.version,
                            },
                        )
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
                        .reserve_stock(
                            self.system_user_id,
                            *tenant_id,
                            *variant_id,
                            *quantity,
                            variant.version,
                        )
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::CreateCinqLead {
                    name,
                    email,
                    source,
                } => {
                    self.cinq_service
                        .create_contact(
                            self.system_user_id,
                            CreateContactCommand {
                                tenant_id: *tenant_id,
                                name: name.clone(),
                                company: None,
                                email: Email::new(email.clone()),
                                phone: None,
                                custom_fields: serde_json::json!({ "source": source }),
                                lead_score: None,
                            },
                        )
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Action::Webhook {
                    url,
                    method,
                    body,
                    headers,
                } => {
                    use reqwest::ClientBuilder;
                    let parsed_url = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
                    let host = parsed_url.host_str().ok_or("Invalid URL")?.to_string();
                    let port = parsed_url.port_or_known_default().unwrap_or(80);
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
                    // Build client with host resolution.
                    let client = ClientBuilder::new()
                        .resolve(host.as_str(), std::net::SocketAddr::new(ip, port))
                        .build()
                        .map_err(|e| e.to_string())?;
                    let mut req = match method.to_uppercase().as_str() {
                        "POST" => client.post(parsed_url.clone()),
                        "PUT" => client.put(parsed_url.clone()),
                        "PATCH" => client.patch(parsed_url.clone()),
                        "DELETE" => client.delete(parsed_url.clone()),
                        _ => client.get(parsed_url.clone()),
                    };
                    for (k, v) in headers {
                        if k.eq_ignore_ascii_case("host") {
                            continue;
                        }
                        req = req.header(k, v);
                    }
                    req = req.json(&body);
                    req.send().await.map_err(|e| e.to_string())?;
                }
                Action::SendEmail { to, subject, body } => {
                    use lettre::transport::smtp::authentication::Credentials;
                    use lettre::{Message, SmtpTransport, Transport};
                    let email = Message::builder()
                        .to(to
                            .parse()
                            .map_err(|e: lettre::address::AddressError| e.to_string())?)
                        .subject(subject)
                        .body(body.clone())
                        .map_err(|e| e.to_string())?;
                    let smtp_host =
                        std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
                    let smtp_user = std::env::var("SMTP_USER").map_err(|e| e.to_string())?;
                    let smtp_pass = std::env::var("SMTP_PASS").map_err(|e| e.to_string())?;
                    let creds = Credentials::new(smtp_user, smtp_pass);
                    let mailer = SmtpTransport::relay(&smtp_host)
                        .map_err(|e| e.to_string())?
                        .credentials(creds)
                        .build();
                    let mailer_clone = mailer.clone();
                    let email_clone = email.clone();
                    tokio::task::spawn_blocking(move || {
                        mailer_clone.send(&email_clone).map_err(|e| e.to_string())
                    })
                    .await
                    .map_err(|e| e.to_string())?
                    .map_err(|e| e.to_string())?;
                    tracing::info!("Email sent to {}", to);
                }
                Action::UpdateRecord {
                    table,
                    record_id,
                    fields,
                } => {
                    let fields_json: serde_json::Value = serde_json::from_str(fields)
                        .map_err(|e| format!("Invalid fields JSON: {}", e))?;
                    let record_uuid = Uuid::parse_str(record_id)
                        .map_err(|e| format!("Invalid record_id: {}", e))?;
                    let tenant_id = *tenant_id;
                    match table.as_str() {
                        "collab_crm.contacts" => {
                            use ataqu_application::cinq_service::UpdateContactCommand;
                            use ataqu_security::{Email, PhoneNumber};
                            let mut cmd = UpdateContactCommand {
                                id: record_uuid,
                                tenant_id,
                                name: None,
                                company: None,
                                email: None,
                                phone: None,
                                custom_fields: None,
                                lead_score: None,
                                expected_version: 0,
                            };
                            if let Some(name) = fields_json.get("name").and_then(|v| v.as_str()) {
                                cmd.name = Some(name.to_string());
                            }
                            if let Some(company) =
                                fields_json.get("company").and_then(|v| v.as_str())
                            {
                                cmd.company = Some(Some(company.to_string()));
                            }
                            if let Some(email) = fields_json.get("email").and_then(|v| v.as_str()) {
                                cmd.email = Some(Email::new(email.to_string()));
                            }
                            if let Some(phone) = fields_json.get("phone").and_then(|v| v.as_str()) {
                                cmd.phone = Some(Some(PhoneNumber::new(phone.to_string())));
                            }
                            if let Some(custom) = fields_json.get("custom_fields") {
                                cmd.custom_fields = Some(custom.clone());
                            }
                            if let Some(lead_score) =
                                fields_json.get("lead_score").and_then(|v| v.as_i64())
                            {
                                cmd.lead_score = Some(lead_score as i32);
                            }
                            let contact = self
                                .cinq_service
                                .get_contact(tenant_id, record_uuid)
                                .await
                                .map_err(|e| e.to_string())?;
                            cmd.expected_version = contact.version;
                            self.cinq_service
                                .update_contact(self.system_user_id, cmd)
                                .await
                                .map_err(|e| e.to_string())?;
                        }
                        "collab_crm.deals" => {
                            use rust_decimal::Decimal;
                            use rust_decimal::prelude::FromPrimitive;
                            let mut cmd = ataqu_application::cinq_service::UpdateDealCommand {
                                id: record_uuid,
                                tenant_id,
                                contact_id: None,
                                title: None,
                                pipeline_stage_id: None,
                                amount: None,
                                status: None,
                                owner_id: None,
                                probability: None,
                                variant_id: None,
                                quantity: None,
                                establishment_id: None,
                                expected_version: 0,
                            };
                            if let Some(title) = fields_json.get("title").and_then(|v| v.as_str()) {
                                cmd.title = Some(title.to_string());
                            }
                            if let Some(amount) = fields_json.get("amount").and_then(|v| v.as_f64())
                            {
                                cmd.amount = Decimal::from_f64(amount);
                            }
                            if let Some(status) = fields_json.get("status").and_then(|v| v.as_str())
                            {
                                cmd.status = Some(match status.to_lowercase().as_str() {
                                    "open" => ataqu_domain_cinq::deal::DealStatus::Open,
                                    "won" => ataqu_domain_cinq::deal::DealStatus::Won,
                                    "lost" => ataqu_domain_cinq::deal::DealStatus::Lost,
                                    _ => return Err(format!("Invalid deal status: {}", status)),
                                });
                            }
                            let deal = self
                                .cinq_service
                                .get_deal(tenant_id, record_uuid)
                                .await
                                .map_err(|e| e.to_string())?;
                            cmd.expected_version = deal.version;
                            self.cinq_service
                                .update_deal(self.system_user_id, cmd)
                                .await
                                .map_err(|e| e.to_string())?;
                        }
                        "vault.variants" => {
                            use ataqu_application::vault_service::UpdateVariantCommand;
                            let mut cmd = UpdateVariantCommand {
                                tenant_id,
                                id: record_uuid,
                                price: None,
                                sku: None,
                                expected_version: 0,
                            };
                            if let Some(price) = fields_json.get("price").and_then(|v| v.as_i64()) {
                                cmd.price = Some(price);
                            }
                            if let Some(sku) = fields_json.get("sku").and_then(|v| v.as_str()) {
                                cmd.sku = Some(sku.to_string());
                            }
                            let variant = self
                                .vault_service
                                .get_variant(tenant_id, record_uuid)
                                .await
                                .map_err(|e| e.to_string())?;
                            cmd.expected_version = variant.version;
                            self.vault_service
                                .update_variant(self.system_user_id, cmd)
                                .await
                                .map_err(|e| e.to_string())?;
                        }
                        _ => {
                            return Err(format!("Unsupported table for update: {}", table));
                        }
                    }
                }
                _ => {
                    tracing::warn!("Action type not yet implemented natively: {:?}", action);
                }
            }
            Ok(())
        }
    }
    let system_user_id = std::env::var("SYSTEM_USER_ID")
        .ok()
        .and_then(|s| Uuid::parse_str(&s).ok())
        .unwrap_or_else(|| {
            tracing::warn!("SYSTEM_USER_ID not set, using default");
            Uuid::parse_str("00000000-0000-0000-0000-000000000001")
                .expect("Hardcoded UUID is invalid")
        });
    // Validate that the system user ID is not nil and is valid
    if system_user_id.is_nil() {
        tracing::warn!("SYSTEM_USER_ID is nil, using default");
        // Keep default
    }
    if let Err(e) = aegis_service.ensure_system_user(system_user_id).await {
        tracing::warn!(error = %e, "Failed to ensure system user exists");
    }
    let action_dispatcher = Arc::new(AtaquActionDispatcher {
        dial_service: dial_service.clone(),
        cinq_service: cinq_service.clone(),
        vault_service: vault_service.clone(),
        system_user_id,
    });
    let spark_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let approval_repo = Arc::new(
        ataqu_infra_repositories::pending_approval_repo::SeaOrmPendingApprovalRepo::new(
            pools.core.clone(),
        ),
    );
    let spark_service = Arc::new(
        SparkService::new(
            spark_repo.clone(),
            action_dispatcher,
            spark_outbox,
            id_gen.clone(),
            clock.clone(),
            Some(audit_repo.clone()),
        )
        .with_approval_repository(approval_repo.clone()),
    );
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
        Some(audit_repo.clone()),
    ));
    // PAUSE

    // Approval worker is not needed for MVP; approvals are handled by API endpoints.
    use ataqu_infra_repositories::pause_repo_impl::PauseRepositoryImpl;
    let pause_employee_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_leave_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_doc_repo = Arc::new(PauseRepositoryImpl::new(pools.ops.clone()));
    let pause_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.ops.clone(),
    ));
    let pause_service = Arc::new(PauseService::new(
        pools.ops.clone(),
        pause_employee_repo,
        pause_leave_repo,
        pause_doc_repo,
        pause_outbox,
        clock.clone(),
    ));
    // Email tracking writer
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
    // Prometheus
    let metrics_handle = metrics_exporter_prometheus::PrometheusBuilder::new()
        .install_recorder()
        .expect("failed to install Prometheus recorder");
    // WebSocket state
    use dashmap::DashMap;
    let ws_registry = Arc::new(DashMap::new());
    let conn_index = Arc::new(DashMap::new());
    let presence_counts = Arc::new(DashMap::new());
    let sso_states = Arc::new(
        moka::sync::Cache::builder()
            .time_to_live(Duration::from_secs(600))
            .build(),
    );
    let allowlist_cache = moka::sync::Cache::<String, Vec<String>>::builder()
        .time_to_live(Duration::from_secs(60))
        .build();
    let trusted_proxies = ataqu_api::middleware::client_ip::TrustedProxies::from_env_value(
        &std::env::var("TRUSTED_PROXIES").unwrap_or_default(),
    );
    let csrf_protector = std::sync::Arc::new(
        ataqu_api::middleware::csrf_token::CsrfProtector::from_env()?,
    );
    let rate_limiter = ataqu_api::middleware::rate_limit::RateLimiter::new(
        100,
        Duration::from_secs(60),
        trusted_proxies.clone(),
    );
    let http_client = reqwest::Client::new();
    let sso_config = ataqu_domain_aegis::sso::SsoConfig {
        google_client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
        google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
        google_redirect_uri: std::env::var("GOOGLE_REDIRECT_URI").unwrap_or_default(),
        microsoft_client_id: std::env::var("MICROSOFT_CLIENT_ID").unwrap_or_default(),
        microsoft_client_secret: std::env::var("MICROSOFT_CLIENT_SECRET").unwrap_or_default(),
        microsoft_redirect_uri: std::env::var("MICROSOFT_REDIRECT_URI").unwrap_or_default(),
    };
    // Cleanup task for rate limiter
    let rate_limiter_cleanup = rate_limiter.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            rate_limiter_cleanup.cleanup();
        }
    });
    // Health service & cache
    let health_repo =
        Arc::new(ataqu_infra_repositories::health_repo::HealthRepository::new(pools.core.clone()));
    let health_service = Arc::new(HealthService::new(
        health_repo,
        clock.clone(),
        pools.clone(),
    ));
    let health_cache = Arc::new(
        moka::sync::Cache::<String, serde_json::Value>::builder()
            .time_to_live(Duration::from_secs(5))
            .build(),
    );
    // S3 stub
    let s3_service = Arc::new(S3Service::new().await.expect("Failed to create S3Service"));
    // Onboarding & Changelog stubs
    let onboarding_outbox = Arc::new(ataqu_application::outbox::SeaOrmOutbox::new(
        pools.core.clone(),
    ));
    let onboarding_service = Arc::new(OnboardingService::new(
        pools.core.clone(),
        onboarding_outbox,
    ));
    let changelog_service = Arc::new(ChangelogService::new(pools.core.clone()));
    // Single onboarding inactivity checker
    let onboarding_service_for_inactivity = onboarding_service.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) = onboarding_service_for_inactivity.check_inactivity().await {
                tracing::error!(error = %e, "Onboarding inactivity check failed");
            }
            tokio::time::sleep(Duration::from_secs(86400)).await;
        }
    });
    // Shopify worker
    let shopify_repo = Arc::new(ShopifyRepositoryImpl::new(pools.vault.clone()));
    let shopify_log_repo = Arc::new(
        ataqu_infra_repositories::shopify_sync_log_repo::ShopifySyncLogRepo::new(
            pools.vault.clone(),
        ),
    );
    let shopify_service = Arc::new(ShopifyService::new(
        shopify_repo,
        vault_service.clone(),
        shopify_log_repo,
    ));
    let shopify_http_client = reqwest::Client::new();
    let shopify_service_clone = shopify_service.clone();
    tokio::spawn(async move {
        loop {
            tracing::info!("Running Shopify sync worker...");
            let client = shopify_http_client.clone();
            shopify_service_clone.sync_all(&client).await;
            tokio::time::sleep(Duration::from_secs(300)).await;
        }
    });
    // Background workers
    let tempo_service_for_workers = tempo_service.clone();
    let spark_service_for_cron = spark_service.clone();
    let vault_service_for_reaper = vault_service.clone();
    let vista_service_for_refresh = vista_service.clone();
    let aegis_service_for_tenants = aegis_service.clone();
    tokio::spawn(async move {
        loop {
            let tenants = match aegis_service_for_tenants.list_tenants().await {
                Ok(t) => t,
                Err(e) => {
                    tracing::error!(error = %e, "Failed to list tenants for no-show worker");
                    tokio::time::sleep(Duration::from_secs(300)).await;
                    continue;
                }
            };
            for tenant_id in tenants {
                let tenant_id = ataqu_kernel::TenantId::new(tenant_id);
                if let Err(e) = tempo_service_for_workers.no_show_worker(tenant_id).await {
                    tracing::error!(error = %e, "No-show worker failed");
                }
                if let Err(e) = tempo_service_for_workers.reminder_worker(tenant_id).await {
                    tracing::error!(error = %e, "Reminder worker failed");
                }
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });
    tokio::spawn(async move {
        loop {
            if let Err(e) = spark_service_for_cron.poll_scheduled_triggers().await {
                tracing::error!(error = %e, "SPARK cron poller failed");
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });
    tokio::spawn(async move {
        loop {
            if let Err(e) = vault_service_for_reaper.reap_expired_reservations().await {
                tracing::error!(error = %e, "VAULT reservation reaper failed");
            }
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    });
    tokio::spawn(async move {
        loop {
            if let Err(e) = vista_service_for_refresh.refresh_materialized_views().await {
                tracing::error!(error = %e, "VISTA materialized view refresh failed");
            }
            tokio::time::sleep(Duration::from_secs(900)).await; // 15 minutes
        }
    });
    // UDS Admin Server (single instance)
    let admin_socket_path =
        std::env::var("ATAQU_ADMIN_SOCK").unwrap_or_else(|_| "/tmp/ataqu-admin.sock".to_string());
    let _ = std::fs::remove_file(&admin_socket_path);
    let admin_listener = match tokio::net::UnixListener::bind(&admin_socket_path) {
        Ok(l) => {
            std::fs::set_permissions(
                &admin_socket_path,
                std::os::unix::fs::PermissionsExt::from_mode(0o600),
            )
            .ok();
            l
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to bind admin UDS");
            return Err(anyhow::anyhow!("Failed to bind admin UDS"));
        }
    };
    let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();
    let health_service_for_admin = health_service.clone();
    let audit_repo_for_admin = audit_repo.clone();
    tokio::spawn(async move {
        use tokio::io::{AsyncBufReadExt, AsyncWriteExt};
        let health_service = health_service_for_admin;
        let audit_repo = audit_repo_for_admin;
        loop {
            match admin_listener.accept().await {
                Ok((mut stream, _)) => {
                    let admin_token = admin_token.clone();
                    let audit_repo = audit_repo.clone();
                    let health_service = health_service.clone();
                    tokio::spawn(async move {
                        let mut reader = tokio::io::BufReader::new(&mut stream);
                        let mut line = String::new();
                        if reader.read_line(&mut line).await.is_ok() {
                            let parts: Vec<&str> = line.trim().splitn(2, ' ').collect();
                            if parts.len() == 2 && parts[0] == admin_token {
                                let cmd = parts[1].trim();
                                let _ = audit_repo
                                    .append_log(
                                        ataqu_kernel::TenantId::new(Uuid::nil()),
                                        Uuid::nil(),
                                        "admin_command",
                                        "admin",
                                        Some("command"),
                                        None,
                                        Some(serde_json::json!({"command": cmd})),
                                        None,
                                        None,
                                        None,
                                    )
                                    .await;
                                let resp = match cmd {
                                    "health" => "OK: Server is running\n".to_string(),
                                    "flush-cache" => {
                                        ataqu_api::middleware::idempotency::flush_idempotency_cache(
                                        );
                                        "OK: Idempotency cache flushed\n".to_string()
                                    }
                                    "status" => match health_service.get_system_health().await {
                                        Ok(health) => {
                                            let json = serde_json::to_string_pretty(&health)
                                                .unwrap_or_default();
                                            format!("{}\n", json)
                                        }
                                        Err(e) => format!("ERROR: Failed to get status: {}\n", e),
                                    },
                                    "audit" => {
                                        let tenant_id =
                                            ataqu_kernel::TenantId::new(uuid::Uuid::nil());
                                        match audit_repo
                                            .list_logs(tenant_id, 10, 0, None, None, None, None)
                                            .await
                                        {
                                            Ok(logs) => {
                                                let json = serde_json::to_string_pretty(&logs)
                                                    .unwrap_or_default();
                                                format!("{}\n", json)
                                            }
                                            Err(e) => {
                                                format!("ERROR: Failed to get audit logs: {}\n", e)
                                            }
                                        }
                                    }
                                    _ => "ERROR: Unknown command\n".to_string(),
                                };
                                let _ = stream.write_all(resp.as_bytes()).await;
                            } else {
                                let _ =
                                    stream.write_all(b"ERROR: Invalid token or command\n").await;
                            }
                        }
                    });
                }
                Err(e) => {
                    tracing::warn!(error = %e, "Admin UDS accept failed");
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });
    // ---------- START NEW CODE ----------
    // Event Registry for Outbox
    let mut event_registry = crate::event_registry::EventRegistry::new();

    // SOND routing: CreateLeadFromForm -> create CINQ contact
    event_registry.register("collab_crm", "CreateLeadFromForm", {
        let cinq = cinq_service.clone();
        move |evt| {
            let cinq = cinq.clone();
            async move {
                let payload = &evt.payload;
                let tenant_id = payload
                    .get("tenant_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                    .ok_or("Missing tenant_id")?;
                let name = payload
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let email_str = payload
                    .get("email")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let source = payload
                    .get("source")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if name.is_empty() || email_str.is_empty() {
                    tracing::warn!("CreateLeadFromForm: missing name or email, skipping");
                    return Ok(());
                }

                let email = ataqu_security::Email::new(email_str);
                let cmd = ataqu_application::cinq_service::CreateContactCommand {
                    tenant_id: ataqu_kernel::TenantId::new(tenant_id),
                    name,
                    company: None,
                    email,
                    phone: None,
                    custom_fields: serde_json::json!({ "source": source }),
                    lead_score: None,
                };
                // Use system user ID (uuid::Uuid::nil() or a configured system user)
                let system_user_id = system_user_id;
                cinq.create_contact(system_user_id, cmd)
                    .await
                    .map_err(|e| format!("Failed to create contact: {}", e))?;
                tracing::info!(
                    "Created lead from form response {}",
                    evt.aggregate_id.unwrap_or_default()
                );
                Ok(())
            }
        }
    });

    // SOND routing: FormRoutingNotification -> send DIAL message
    event_registry.register("dial", "FormRoutingNotification", {
        let dial = dial_service.clone();
        move |evt| {
            let dial = dial.clone();
            async move {
                let payload = &evt.payload;
                let tenant_id = payload
                    .get("tenant_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                    .ok_or("Missing tenant_id")?;
                let message = payload
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let target = payload
                    .get("target")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if message.is_empty() || target.is_empty() {
                    tracing::warn!("FormRoutingNotification: missing message or target, skipping");
                    return Ok(());
                }

                // Try to parse target as channel_id (UUID)
                if let Ok(channel_id) = uuid::Uuid::parse_str(&target) {
                    // Send to a channel
                    let system_user_id = system_user_id;
                    let cmd = ataqu_application::dial_service::SendMessageCommand {
                        tenant_id: ataqu_kernel::TenantId::new(tenant_id),
                        channel_id,
                        thread_id: None,
                        author_id: system_user_id,
                        content: message,
                    };
                    dial.send_message(cmd)
                        .await
                        .map_err(|e| format!("Failed to send notification: {}", e))?;
                } else if let Ok(user_id) = uuid::Uuid::parse_str(&target) {
                    // Send as a DM to the target user via the DIAL service
                    // (finds or creates the 1:1 DM channel).
                    let system_user_id = system_user_id;
                    let _ = dial
                        .send_direct_message(
                            ataqu_kernel::TenantId::new(tenant_id),
                            system_user_id,
                            user_id,
                            message,
                        )
                        .await
                        .map_err(|e| format!("Failed to send DM notification: {}", e));
                } else {
                    tracing::warn!("FormRoutingNotification: invalid target (must be UUID)");
                }
                Ok(())
            }
        }
    });

    // SOND routing: WebhookTrigger -> execute webhook
    event_registry.register("spark", "WebhookTrigger", {
        let client = http_client.clone();
        move |evt| {
            let client = client.clone();
            async move {
                let payload = &evt.payload;
                let url = payload
                    .get("url")
                    .and_then(|v| v.as_str())
                    .ok_or("Missing url")?;
                let method = payload
                    .get("method")
                    .and_then(|v| v.as_str())
                    .unwrap_or("POST");
                let answers = payload
                    .get("answers")
                    .cloned()
                    .unwrap_or(serde_json::json!({}));

                // Simple webhook execution with timeout and no retry
                let request = match method.to_uppercase().as_str() {
                    "POST" => client.post(url).json(&answers),
                    "PUT" => client.put(url).json(&answers),
                    "PATCH" => client.patch(url).json(&answers),
                    "DELETE" => client.delete(url),
                    _ => client.get(url).query(&answers),
                };
                let resp = request
                    .send()
                    .await
                    .map_err(|e| format!("Webhook request failed: {}", e))?;
                if resp.status().is_success() {
                    tracing::info!(
                        "Webhook triggered for response {}",
                        evt.aggregate_id.unwrap_or_default()
                    );
                } else {
                    tracing::warn!("Webhook returned error: {}", resp.status());
                }
                Ok(())
            }
        }
    });

    // Register SPARK triggers
    event_registry.register("collab_crm", "DealCreated", {
        let spark = spark_service.clone();
        move |evt| {
            let spark = spark.clone();
            async move {
                spark
                    .evaluate_trigger(&evt)
                    .await
                    .map_err(|e| e.to_string())
            }
        }
    });
    event_registry.register("collab_crm", "ContactCreated", {
        let spark = spark_service.clone();
        move |evt| {
            let spark = spark.clone();
            async move {
                spark
                    .evaluate_trigger(&evt)
                    .await
                    .map_err(|e| e.to_string())
            }
        }
    });
    event_registry.register("core", "UserCreated", {
        let spark = spark_service.clone();
        move |evt| {
            let spark = spark.clone();
            async move {
                spark
                    .evaluate_trigger(&evt)
                    .await
                    .map_err(|e| e.to_string())
            }
        }
    });
    // VISTA aggregation
    event_registry.register("collab_crm", "DealCreated", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("collab_crm", "DealWon", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("collab_crm", "ContactCreated", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("vault", "ProductCreated", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("vault", "LowStockAlert", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("collab_ops", "LeaveRequestedEvent", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("collab_ops", "LeaveStatusChanged", {
        let vista = vista_service.clone();
        move |evt| {
            let vista = vista.clone();
            async move { vista.process_event(&evt).await.map_err(|e| e.to_string()) }
        }
    });
    event_registry.register("core", "GdprDeletionRequested", {
        use ataqu_application::gdpr::saga_starter::GdprSagaStarter;
        let gdpr_starter = Arc::new(GdprSagaStarter::new(
            pools.core.get_postgres_connection_pool().clone(),
        ));
        move |evt| {
            let starter = gdpr_starter.clone();
            async move {
                if let Some(tenant_id) = evt.aggregate_id {
                    starter
                        .handle_event(tenant_id)
                        .await
                        .map_err(|e| e.to_string())
                } else {
                    Ok(())
                }
            }
        }
    });
    event_registry.register("core", "InactivityReminder", {
        let _onboarding = onboarding_service.clone();
        move |evt| {
            let _onboarding = _onboarding.clone();
            async move {
                tracing::info!(event_id = %evt.id, "InactivityReminder event received");
                Ok(())
            }
        }
    });
    // Import worker handler
    event_registry.register("core", "ImportJob", {
        let import_worker = Arc::new(ataqu_application::import_worker::ImportWorker::new(
            core_outbox_for_gdpr.clone(),
        ));
        move |evt| {
            let worker = import_worker.clone();
            async move { worker.handle_event(evt).await.map_err(|e| e.to_string()) }
        }
    });
    // Spawn Outbox Dispatcher
    use ataqu_infra_outbox::OutboxDispatcher;
    let dispatcher = OutboxDispatcher::new(pools.dispatcher.clone(), move |event| {
        let registry = event_registry.clone();
        async move {
            registry
                .dispatch(event)
                .await
                .map_err(ataqu_infra_outbox::DispatcherError::Handler)
        }
    })
    .with_poll_interval(std::time::Duration::from_secs(5));
    tokio::spawn(async move {
        tracing::info!("Outbox dispatcher started");
        dispatcher.run().await;
    });
    // ---------- END NEW CODE ----------
    // Spawn GDPR saga runner
    use ataqu_application::gdpr::saga_runner::GdprSagaRunner;
    let gdpr_runner = GdprSagaRunner::new(
        pools.core.get_postgres_connection_pool().clone(),
        core_outbox_for_gdpr.clone(),
        s3_service.clone(),
    );
    tokio::spawn(async move {
        gdpr_runner.run().await;
    });
    // Spawn the SPARK approval worker (polls pending approvals, notifies via DIAL)
    use ataqu_application::approval_worker::ApprovalWorker;
    let approval_worker = ApprovalWorker::new(
        approval_repo,
        spark_service.clone(),
        dial_service.clone(),
        system_user_id,
        std::env::var("APPROVAL_NOTIFY_CHANNEL_ID")
            .ok()
            .and_then(|v| Uuid::parse_str(&v).ok()),
    );
    tokio::spawn(async move {
        approval_worker.run().await;
    });
    // Spawn scheduled tasks cron worker
    use ataqu_infra_cron::worker::run_cron_worker;
    let cron_pool = pools.core.get_postgres_connection_pool().clone();
    tokio::spawn(async move {
        run_cron_worker(cron_pool).await;
    });
    // Spawn S3 orphan reaper (every hour)
    let s3_reaper = s3_service.clone();
    let db_reaper = pools.core.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) =
                ataqu_infra_storage::orphan_reaper::reap_orphans(&s3_reaper, &db_reaper).await
            {
                tracing::error!(error = %e, "S3 orphan reaper failed");
            }
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    });
    // Spawn S3 orphan reaper (every hour)
    let s3_reaper = s3_service.clone();
    let db_reaper = pools.core.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) =
                ataqu_infra_storage::orphan_reaper::reap_orphans(&s3_reaper, &db_reaper).await
            {
                tracing::error!(error = %e, "S3 orphan reaper failed");
            }
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    });
    // Spawn Tempo OAuth refresh worker (every 15 minutes)
    let tempo_db = pools.ops.clone();
    let tempo_client = http_client.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) = ataqu_application::tempo_refresh_worker::refresh_expiring_tokens(
                tempo_db.clone(),
                tempo_client.clone(),
            )
            .await
            {
                tracing::error!(error = %e, "Tempo refresh worker failed");
            }
            tokio::time::sleep(std::time::Duration::from_secs(900)).await;
        }
    });
    let app_state = AppState {
        db: pools.core.clone(),
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
        shopify_service: shopify_service.clone(),
        jwt_secret,
        id_gen,
        clock,
        ws_registry,
        conn_index,
        presence_counts,
        email_tracking_tx,
        rate_limiter,
        metrics_handle,
        sso_states,
        sso_config,
        http_client,
        health_service,
        health_cache,
        s3_service,
        onboarding_service,
        changelog_service,
        audit_repo: audit_repo.clone(),
        trusted_proxies,
        allowlist_cache,
        csrf_protector,
    };
    let app = create_router(app_state);
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = TcpListener::bind(addr).await?;
    info!("Server listening on {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
