use std::os::unix::net::UnixListener;
use std::io::Read;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let socket_path = "/tmp/ataqu-admin.sock";
    let _ = std::fs::remove_file(socket_path);
    let listener = UnixListener::bind(socket_path)?;
    tracing::info!("Admin server listening on UDS: {}", socket_path);

    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0; 1024];
                let bytes_read = stream.read(&mut buffer)?;
                let command = String::from_utf8_lossy(&buffer[..bytes_read]);
                tracing::info!("Received admin command: {}", command);

                // Basic response. Real implementation would parse command,
                // authenticate, write to audit_logs, and execute.
                let response = format!("Command '{}' received and logged.\n", command);
                use std::io::Write;
                stream.write_all(response.as_bytes())?;
            }
            Err(e) => {
                tracing::error!("Admin accept error: {}", e);
            }
        }
    }
}
