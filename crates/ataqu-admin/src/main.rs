use std::io::{Read, Write};
use std::os::unix::net::UnixStream;
use sea_orm_migration::MigratorTrait;

fn print_help() {
    eprintln!("Usage: ataqu-admin <command> [args]");
    eprintln!("");
    eprintln!("Commands:");
    eprintln!("  health           - Check server health");
    eprintln!("  flush-cache      - Flush idempotency cache");
    eprintln!("  migrate          - Run database migrations");
    eprintln!("  status           - Show detailed server status");
    eprintln!("  audit [limit]    - Query audit logs (default limit 10)");
    eprintln!("  help             - Show this help message");
}

fn main() {
    let socket_path =
        std::env::var("ATAQU_ADMIN_SOCK").unwrap_or_else(|_| "/tmp/ataqu-admin.sock".to_string());
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

    if command == "migrate" {
        let db_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        let runtime = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        runtime.block_on(async {
            let db = sea_orm::Database::connect(&db_url).await
                .expect("Failed to connect to database");
            ataqu_infra_migration::Migrator::up(&db, None).await
                .expect("Migration failed");
            println!("Migrations applied successfully.");
        });
        std::process::exit(0);
    }

    if admin_token.is_empty() {
        eprintln!("ADMIN_TOKEN environment variable not set");
        std::process::exit(1);
    }

    if command == "status" || command == "audit" {
        let mut stream = match UnixStream::connect(&socket_path) {
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
        std::process::exit(0);
    }

    // For other commands (health, flush-cache), use the existing UDS flow
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
