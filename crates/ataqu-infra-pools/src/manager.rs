use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PoolError {
    #[error("SeaORM connection error: {0}")]
    SeaOrm(#[from] sea_orm::DbErr),
    #[error("Sqlx connection error: {0}")]
    Sqlx(#[from] sqlx::Error),
}

pub struct Pools {
    pub core: DatabaseConnection,
    pub cinq: DatabaseConnection,
    pub ops: DatabaseConnection,
    pub vault: DatabaseConnection,
    pub dial: DatabaseConnection,
    pub vista: DatabaseConnection,
    pub dispatcher: PgPool,
    pub admin: DatabaseConnection,
}

impl Pools {
    pub async fn new(database_url: &str) -> Result<Self, PoolError> {
        let make_url = |role: &str| -> String {
            if database_url.contains('?') {
                format!("{}&options=-c%20role={}", database_url, role)
            } else {
                format!("{}?options=-c%20role={}", database_url, role)
            }
        };

        let mut core_opts = ConnectOptions::new(make_url("core_role"));
        core_opts.max_connections(5);
        let core = Database::connect(core_opts).await?;

        let mut cinq_opts = ConnectOptions::new(make_url("cinq_role"));
        cinq_opts.max_connections(5);
        let cinq = Database::connect(cinq_opts).await?;

        let mut ops_opts = ConnectOptions::new(make_url("ops_role"));
        ops_opts.max_connections(5);
        let ops = Database::connect(ops_opts).await?;

        let mut vault_opts = ConnectOptions::new(make_url("vault_role"));
        vault_opts.max_connections(5);
        let vault = Database::connect(vault_opts).await?;

        let mut dial_opts = ConnectOptions::new(make_url("dial_role"));
        dial_opts.max_connections(5);
        let dial = Database::connect(dial_opts).await?;

        let mut vista_opts = ConnectOptions::new(make_url("vista_role"));
        vista_opts.max_connections(5);
        let vista = Database::connect(vista_opts).await?;

        let dispatcher_url = make_url("dispatcher_role");
        let dispatcher = PgPoolOptions::new()
            .max_connections(3)
            .connect(&dispatcher_url)
            .await?;

        let mut admin_opts = ConnectOptions::new(make_url("admin_role"));
        admin_opts.max_connections(2);
        let admin = Database::connect(admin_opts).await?;

        Ok(Self {
            core,
            cinq,
            ops,
            vault,
            dial,
            vista,
            dispatcher,
            admin,
        })
    }
}
