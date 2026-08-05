use std::os::unix::net::UnixListener;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let socket_path = "/tmp/ataqu-admin.sock";
    let _ = std::fs::remove_file(socket_path);
    let listener = UnixListener::bind(socket_path)?;
    tracing::info!("Admin server listening on UDS: {}", socket_path);

    loop {
        match listener.accept() {
            Ok((_stream, _addr)) => {
                tracing::info!("Admin connection received. CLI logic not yet implemented.");
            }
            Err(e) => {
                tracing::error!("Admin accept error: {}", e);
            }
        }
    }
}
