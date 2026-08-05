use tokio::io::AsyncReadExt;
use tokio::net::UnixListener;

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

                            let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();
                            if !admin_token.is_empty() && command.starts_with(&admin_token) {
                                let actual_cmd = command.trim_start_matches(&admin_token).trim();
                                tracing::info!("Authorized admin command: {}", actual_cmd);
                                let response =
                                    format!("Command '{}' authorized and executed.\n", actual_cmd);
                                use tokio::io::AsyncWriteExt;
                                let _ = stream.write_all(response.as_bytes()).await;
                            } else {
                                tracing::warn!("Unauthorized admin command attempt");
                                use tokio::io::AsyncWriteExt;
                                let _ = stream.write_all(b"Unauthorized\n").await;
                            }
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
