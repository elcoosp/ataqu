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
        let mut db_options = sea_orm::ConnectOptions::new(db_url.to_string());
        db_options.max_connections(5);

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
            .connect_lazy(db_url)?;

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
