use sea_orm::DatabaseConnection;

#[derive(Clone)]
pub struct Pools {
    pub core: DatabaseConnection,
    pub admin: DatabaseConnection,
    pub dispatcher: sqlx::PgPool,
    pub cinq: DatabaseConnection,
    pub ops: DatabaseConnection,
    pub vault: DatabaseConnection,
    pub dial: DatabaseConnection,
    pub vista: DatabaseConnection,
    pub spark: DatabaseConnection,
}

impl Pools {
    pub fn get_pool_stats(&self) -> (i32, i32, i32) {
        let mut total_size = 0;
        let mut total_idle = 0;
        let connections = [
            &self.core,
            &self.admin,
            &self.cinq,
            &self.ops,
            &self.vault,
            &self.dial,
            &self.vista,
            &self.spark,
        ];
        for conn in connections {
            let pool = conn.get_postgres_connection_pool();
            total_size += pool.size() as i32;
            total_idle += pool.num_idle() as i32;
        }
        let used = total_size - total_idle;
        // Waiting is not exposed by sqlx; we approximate as 0 for now.
        // In future, we could add instrumentation.
        let waiting = 0;
        (used, total_size, waiting)
    }

    pub async fn new(db_url: &str) -> anyhow::Result<Self> {
        // HARDENING (fixed in audit): the pools had no acquire timeout, no
        // max lifetime and no statement/idle-in-transaction timeouts — one
        // slow query or leaked transaction stalled every waiter for the
        // sqlx default 30s and cascaded into pool exhaustion.
        let mut db_options = sea_orm::ConnectOptions::new(db_url.to_string());
        db_options.max_connections(5);
        db_options.min_connections(1);
        // Bound how long a request waits for a free connection.
        db_options.acquire_timeout(std::time::Duration::from_secs(3));
        // Recycle connections so Postgres-side bloat and failovers are bounded.
        db_options.max_lifetime(std::time::Duration::from_secs(30 * 60));
        db_options.idle_timeout(std::time::Duration::from_secs(5 * 60));
        // Server-side guards: kill runaway statements and abandoned
        // transactions instead of pinning a pool slot forever (dispatcher
        // pool; the guarded URL appends libpq `options`).
        db_options.sqlx_logging(false);
        let guarded_url = if db_url.contains('?') {
            format!(
                "{db_url}&options=-c%20statement_timeout%3D15s%20-c%20idle_in_transaction_session_timeout%3D30s"
            )
        } else {
            format!(
                "{db_url}?options=-c%20statement_timeout%3D15s%20-c%20idle_in_transaction_session_timeout%3D30s"
            )
        };

        let core = sea_orm::Database::connect(db_options.clone()).await?;
        let admin = sea_orm::Database::connect(db_options.clone()).await?;
        let cinq = sea_orm::Database::connect(db_options.clone()).await?;
        let ops = sea_orm::Database::connect(db_options.clone()).await?;
        let vault = sea_orm::Database::connect(db_options.clone()).await?;
        let dial = sea_orm::Database::connect(db_options.clone()).await?;
        let vista = sea_orm::Database::connect(db_options.clone()).await?;
        let spark = sea_orm::Database::connect(db_options.clone()).await?;

        let dispatcher = sqlx::postgres::PgPoolOptions::new()
            .max_connections(3)
            .acquire_timeout(std::time::Duration::from_secs(3))
            .max_lifetime(std::time::Duration::from_secs(30 * 60))
            .idle_timeout(std::time::Duration::from_secs(5 * 60))
            .after_connect(|conn, _| {
                Box::pin(async move {
                    sqlx::query("SET statement_timeout = '15s'; SET idle_in_transaction_session_timeout = '30s';")
                        .execute(conn)
                        .await?;
                    Ok(())
                })
            })
            .connect_lazy(&guarded_url)?;

        Ok(Self {
            core,
            admin,
            dispatcher,
            cinq,
            ops,
            vault,
            dial,
            vista,
            spark,
        })
    }
}
