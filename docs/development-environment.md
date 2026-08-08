# ⚙️ ATAQU DEVELOPMENT ENVIRONMENT — Local Setup Guide

**Version:** 1.0
**Date:** 2026-08-08
**Target:** Developers and AI agents

> This document provides a step‑by‑step guide to spin up the entire Ataqu stack locally. It consolidates scattered setup information from `tech-stack.md`, `project.md`, and `TASK-000`. Follow these instructions exactly to avoid common pitfalls.

---

## 1. Prerequisites

| Tool | Version | Verification |
|------|---------|--------------|
| **Rust** | 1.97.1 (2024 edition) | `rustc --version` |
| **Node.js** | 26.5.1 (Current) | `node --version` |
| **pnpm** | 12.0.0-alpha.16 | `pnpm --version` |
| **PostgreSQL** | 18.4 | `psql --version` |
| **Docker** | Latest (for testcontainers) | `docker --version` |
| **Git** | Latest | `git --version` |

### 1.1 Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default 1.97.1
rustup component add clippy rustfmt
```

### 1.2 Install Node.js (using nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 26.5.1
nvm use 26.5.1
```

### 1.3 Install pnpm
```bash
npm install -g pnpm@12.0.0-alpha.16
```

### 1.4 Install PostgreSQL 18.4 (macOS / Linux)
- **macOS (Homebrew):**
  ```bash
  brew install postgresql@18
  brew services start postgresql@18
  ```
- **Ubuntu/Debian:**
  ```bash
  sudo apt update
  sudo apt install postgresql-18 postgresql-client-18
  sudo systemctl start postgresql
  ```

### 1.5 Install Docker
Follow the official guide for your OS. Ensure Docker is running before running integration tests.

---

## 2. Repository Setup

```bash
git clone git@github.com:elcoosp/ataqu.git
cd ataqu
```

---

## 3. Environment Variables

Create a `.env` file in the repository root with the following variables:

```bash
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5433/ataqu_dev
DATABASE_TEST_URL=postgres://postgres:postgres@localhost:5433/ataqu_test

# S3 Storage (for uploads and email tracking spill)
S3_BUCKET=ataqu-uploads
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-central-1

# Shopify OAuth (for VAULT sync)
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_REDIRECT_URI=http://localhost:8080/api/v1/vault/shopify/callback

# Email
POSTMARK_API_KEY=your_postmark_key
FROM_EMAIL=support@ataqu.com

# JWT
JWT_SECRET=your_jwt_secret

# Stripe (for billing)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Note:** For local development, you can use `postgres://postgres:postgres@localhost:5433/ataqu_dev` and `postgres://postgres:postgres@localhost:5433/ataqu_test`. Make sure PostgreSQL is running on port 5433.

---

## 4. Initialize the Database

```bash
# Create the development and test databases
createdb -h localhost -p 5433 -U postgres ataqu_dev
createdb -h localhost -p 5433 -U postgres ataqu_test

# Run migrations
cargo run --bin migrator
```

**Expected output:** All migrations run successfully.

---

## 5. Build the Backend

```bash
cargo build --workspace
```

**If you get compilation errors:** Ensure you have the correct Rust version. Run `rustup default 1.97.1`.

---

## 6. Run the Backend Server

```bash
cargo run --bin ataqu-server
```

The server will start on port `443` (HTTPS). For local development, you can use `http` by setting `RUST_ENV=development`:

```bash
RUST_ENV=development cargo run --bin ataqu-server
```

**Health check:** `curl http://localhost:8080/api/v1/health/status`

---

## 7. Frontend Setup

```bash
# Install dependencies
pnpm install

# Start all 10 SPAs in development mode
pnpm dev
```

The frontend apps will be available at:
- AEGIS: `http://localhost:5173`
- CINQ: `http://localhost:5174`
- DIAL: `http://localhost:5175`
- PIVOT: `http://localhost:5176`
- SPARK: `http://localhost:5177`
- TEMPO: `http://localhost:5178`
- SOND: `http://localhost:5179`
- VAULT: `http://localhost:5180`
- PAUSE: `http://localhost:5181`
- VISTA: `http://localhost:5182`

**Note:** The frontend apps proxy API requests to the backend (`http://localhost:8080`) via Vite’s proxy configuration.

---

## 8. Run Tests

```bash
# Backend tests (unit + integration)
cargo test --workspace

# Frontend tests (Vitest)
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Load tests (k6)
k6 run scripts/k6/loadtest.js
```

---

## 9. Common Troubleshooting

| Issue | Solution |
|-------|----------|
| **PostgreSQL connection refused** | Check that PostgreSQL is running on port 5433. `brew services list` or `sudo systemctl status postgresql`. |
| **Migration fails with "outbox_id_seq not found"** | Ensure the sequence grants are applied. Run `cargo run --bin migrator` again. |
| **Cargo build fails with "unstable feature"** | Update Rust: `rustup update` and ensure `rust-toolchain.toml` exists. |
| **pnpm install fails** | Clear cache: `pnpm store prune` and reinstall. |
| **Frontend proxies not working** | Ensure the backend is running on `http://localhost:8080`. Check `VITE_API_BASE_URL` in `.env`. |
| **Idempotency‑Key required errors** | Ensure your frontend is sending the `Idempotency-Key` header. Check `useIdempotency()` hook. |

---

## 10. IDE Setup

### VS Code
- Install `rust-analyzer`, `Tailwind CSS IntelliSense`, `Prettier`, `Biome`.
- Use the workspace recommendations.

### IntelliJ / CLion
- Enable Rust plugin.
- Set the project SDK to Rust 1.97.1.

---

**Document ready. Keep it updated as the toolchain evolves.**
