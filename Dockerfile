# syntax=docker/dockerfile:1
ARG RUST_VERSION=1.97.1
FROM rust:${RUST_VERSION}-bookworm AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends cmake pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p ataqu-bin \
 && mkdir -p /out && cp target/release/ataqu target/release/migrator /out/

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 curl && rm -rf /var/lib/apt/lists/* \
 && useradd -r -u 10001 ataqu && mkdir -p /var/ataqu/logs /var/ataqu/email-spill && chown -R ataqu /var/ataqu
USER ataqu
WORKDIR /var/ataqu
COPY --from=build /out/ataqu /usr/local/bin/ataqu
COPY --from=build /out/migrator /usr/local/bin/migrator
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD curl -fsS localhost:3000/ready || exit 1
CMD ["ataqu"]
