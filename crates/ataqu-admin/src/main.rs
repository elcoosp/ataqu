use std::net::SocketAddr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let app = axum::Router::new().route("/health", axum::routing::get(|| async { "ok" }));
    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    tracing::info!("Admin server listening on {}", addr);
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
