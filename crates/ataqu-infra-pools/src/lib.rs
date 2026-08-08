use sea_orm::DatabaseConnection;

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
