# 📊 ATAQU MONITORING & ALERTING PLAYBOOK — Observability Strategy

**Version:** 1.0
**Date:** 2026-08-08
**Target:** Engineers and on‑call staff

> This document defines how Ataqu is monitored, which metrics are critical, how alerts are configured, and how to use logs and traces to debug issues.

---

## 1. Observability Stack

| Component | Purpose | Access |
|-----------|---------|--------|
| **Prometheus** | Metrics collection | `http://<host>:9090` |
| **Grafana** | Dashboards | `http://<host>:3000` |
| **Loki** | Log aggregation | `http://<host>:3100` |
| **Tempo** | Distributed tracing | `http://<host>:3200` |
| **OTLP HTTP** | Export from Rust binary | Port `4318` |

All components run on the same VPS (Phase 1) or as managed services (Phase 2).

---

## 2. Key Metrics & Alert Rules

All metrics are exposed at `/metrics` by the Rust binary. Alert rules are defined in `prometheus/alerts.yml`.

### 2.1 Critical Metrics (P0/P1)

| Metric | Alert Condition | Severity | Action |
|--------|-----------------|----------|--------|
| `ataqu_db_active_connections` | > 35 for 1 minute | P1 | Check for connection leaks; restart if needed. |
| `ataqu_outbox_notify_lag_seconds` | > 5 seconds | P1 | Outbox relay is stuck; restart dispatcher. |
| `ataqu_dlq_poison_message_total` | > 0 | P2 | Inspect DLQ, replay if possible. |
| `ataqu_gdpr_deletion_failed_total` | > 0 | **P0** | Immediately investigate GDPR saga failure. |
| `ataqu_email_tracking_recovery_failed_total` | > 0 | **P0** | Email tracking spill recovery failed. |
| `ataqu_idempotency_lock_timeout_total` | > 10 / min | P2 | Check for long transactions. |
| `ataqu_moka_cache_size` | > 9,500 | P3 | Cache approaching limit. |
| `vista_aggregator_lag_total` | > 5,000 | P2 | VISTA aggregator falling behind. |
| `ataqu_health_status` | > 1 (degraded) | P2 | Health endpoint returns degraded. |
| `ataqu_workflow_failures_total` | > 10 / hour | P1 | Many SPARK workflows failing. |

### 2.2 Performance Metrics (P3)

- `ataqu_slow_tx_total` – Transactions > 500ms.
- `ataqu_idempotency_cache_hit_ratio` – Cache effectiveness.
- `ataqu_presence_online_users` – Online users count.
- `no_show_detected_total` – No‑show detection events.

---

## 3. Dashboards

### 3.1 Main Dashboard (Grafana)

| Panel | Data Source | Description |
|-------|-------------|-------------|
| **System Health** | `ataqu_health_status` | Overall status (green/yellow/red). |
| **Connection Pool** | `ataqu_db_active_connections` | Current usage vs. max (35). |
| **Outbox Lag** | `ataqu_outbox_notify_lag_seconds` | Delay in event dispatch. |
| **DLQ Depth** | `ataqu_dlq_poison_message_total` | Number of failed events. |
| **Workflow Failures** | `ataqu_workflow_failures_total` | Rate of failed SPARK workflows. |
| **API Latency** | p99 latency from Axum metrics | Response times. |
| **Error Rate** | HTTP 5xx count | Application errors. |

### 3.2 Business Dashboard (VISTA)

- MRR, ARR, Active Tenants.
- Bundle Adoption Rate.
- Decommission Rate (competitor cancellations).

---

## 4. Logging

### 4.1 Log Files

Logs are written to `/var/log/ataqu/` with rotation:

| File | Level | Content |
|------|-------|---------|
| `critical.log.json` | WARN, ERROR | Panics, critical failures, DLQ events. |
| `operational.log.json` | INFO, DEBUG | All requests, background tasks, traces. |

### 4.2 Log Query (Loki)

Example queries:
```log
{filename="/var/log/ataqu/operational.log.json"} |= "outbox"
{filename="/var/log/ataqu/critical.log.json"} |= "DLQ"
{filename="/var/log/ataqu/operational.log.json"} |= "trace_id=abc123"
```

### 4.3 Tracing (Tempo)

Every HTTP request and outbox event carries a `trace_id`. To debug:

1. Find the `trace_id` from the user's browser network tab or from logs.
2. In Grafana Tempo, query by `trace_id`.
3. Visualise the entire request flow across services and spans.

---

## 5. Alerting Configuration

Alerts are evaluated by Prometheus every 15 seconds. Notifications are sent to:

- **PagerDuty:** P0 and P1 alerts.
- **Slack `#eng-alerts`:** All alerts.

### 5.1 Example Alert Rule (Outbox Lag)

```yaml
groups:
  - name: ataqu_alerts
    rules:
      - alert: OutboxLagHigh
        expr: ataqu_outbox_notify_lag_seconds > 5
        for: 1m
        labels:
          severity: p1
        annotations:
          summary: "Outbox relay lagging"
          description: "Lag is {{ $value }} seconds. Check dispatcher health."
```

### 5.2 On‑Call Rotation

- **Weekdays:** Primary on‑call engineer.
- **Weekends:** Secondary on‑call.
- **PagerDuty:** All P0 alerts page immediately; P1 alerts page after 5 minutes.

---

## 6. Health Checks

The endpoint `/health/ready` is used by the load balancer.

- Returns `200 OK` if all critical tasks are running.
- Returns `503 Service Unavailable` if any critical task is down (e.g., outbox dispatcher, VISTA aggregator).

**Additional checks:**
- Outbox lag > 5s → 503.
- DLQ depth > 10 → 503.
- Connection pool > 90% → 503.

---

## 7. Incident Response

When an alert fires, follow the `incident-response-runbook.md`:

1. **Acknowledge** the alert in PagerDuty.
2. **Check Grafana** for the current state.
3. **Examine logs** for the trace.
4. **Take action** (restart service, clear DLQ, etc.).
5. **Update status page** (`status.ataqu.com`).
6. **Write RCA** within 24 hours for P0/P1 incidents.

---

## 8. Maintenance

- **Prometheus retention:** 15 days (disk space permitting).
- **Loki retention:** 30 days.
- **Grafana dashboards:** Version‑controlled in `grafana/dashboards/`.

---

**This playbook is essential for maintaining operational trust. Keep it updated as the stack evolves.**
