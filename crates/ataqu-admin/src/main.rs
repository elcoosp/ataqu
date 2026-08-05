use tokio::net::UnixListener;
use tokio::io::AsyncReadExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let socket_path = "/tmp/ataqu-admin.sock";
    let _ = std::fs::remove_file(socket_path);
    let listener = UnixListener::bind(socket_path)?;
    tracing::info!("Admin server listening on UDS: {}", socket_path);

    loop {
        match listener.accept().await {
            Ok((mut stream, _)) => {
                tokio::spawn(async move {
                    let mut buffer = [0; 1024];
                    match stream.read(&mut buffer).await {
                        Ok(bytes_read) => {
                            let command = String::from_utf8_lossy(&buffer[..bytes_read]);
                            tracing::info!("Received admin command: {}", command);

                            // TODO: Parse command, authenticate, write to audit_logs, and execute.
                            let response = format!("Command '{}' received and logged.\n", command);
                            use tokio::io::AsyncWriteExt;
                            let _ = stream.write_all(response.as_bytes()).await;
                        }
                        Err(e) => {
                            tracing::error!("Failed to read from admin stream: {}", e);
                        }
                    }
                });
            }
            Err(e) => {
                tracing::error!("Admin accept error: {}", e);
            }
        }
    }
}
