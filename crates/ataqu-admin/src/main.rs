use std::io::{Read, Write};
use std::os::unix::net::UnixStream;

fn main() {
    let socket_path = "/tmp/ataqu-admin.sock";
    let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();

    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| {
        eprintln!("Usage: ataqu-admin <command>");
        std::process::exit(1);
    });

    if admin_token.is_empty() {
        eprintln!("ADMIN_TOKEN environment variable not set");
        std::process::exit(1);
    }

    let mut stream = match UnixStream::connect(socket_path) {
        Ok(stream) => stream,
        Err(e) => {
            eprintln!("Failed to connect to UDS: {}", e);
            std::process::exit(1);
        }
    };

    let full_command = format!("{} {}", admin_token, command);
    if let Err(e) = stream.write_all(full_command.as_bytes()) {
        eprintln!("Failed to write to UDS: {}", e);
        std::process::exit(1);
    }

    let mut response = String::new();
    if let Err(e) = stream.read_to_string(&mut response) {
        eprintln!("Failed to read from UDS: {}", e);
        std::process::exit(1);
    }

    print!("{}", response);
}
