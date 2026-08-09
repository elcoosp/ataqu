use std::io::{Read, Write};
use std::os::unix::net::UnixStream;

fn print_help() {
    eprintln!("Usage: ataqu-admin <command> [args]");
    eprintln!("");
    eprintln!("Commands:");
    eprintln!("  health       - Check server health");
    eprintln!("  flush-cache  - Flush idempotency cache");
    eprintln!("  help         - Show this help message");
}

fn main() {
    let socket_path = std::env::var("ATAQU_ADMIN_SOCK").unwrap_or_else(|_| "/tmp/ataqu-admin.sock".to_string());
    let admin_token = std::env::var("ADMIN_TOKEN").unwrap_or_default();

    let mut args = std::env::args().skip(1);
    let command = args.next().unwrap_or_else(|| {
        print_help();
        std::process::exit(1);
    });

    if command == "help" || command == "--help" || command == "-h" {
        print_help();
        std::process::exit(0);
    }

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

    if let Err(e) = stream.shutdown(std::net::Shutdown::Write) {
        eprintln!("Failed to shutdown write: {}", e);
    }

    let mut response = String::new();
    if let Err(e) = stream.read_to_string(&mut response) {
        eprintln!("Failed to read from UDS: {}", e);
        std::process::exit(1);
    }

    print!("{}", response);
}
