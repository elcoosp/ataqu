# Ataqu Model Context Protocol (MCP) v4 Specification

## 1. Executive Summary: The v4 Synthesis
The **Ataqu MCP v4** specification represents the synthesis of **v2 (Siloed Data Access)** and **v3 (Cross-Domain Actions)** into a unified, state-aware, and secure Intelligent Orchestration layer. 

While v2 allowed AI agents to read from Ataqu's distinct modules (CINQ, DIAL, VAULT, etc.) and v3 introduced the ability to trigger mutations and SPARK workflows, v4 introduces **Context-Aware State Management**, **Idempotency-Native Tooling**, and **PII-Safe Context Windows**. It leverages Ataqu's underlying `core.outbox` pattern, `Idempotency-Key` enforcement, and `PiiAccessKey` capability system to allow AI agents to safely orchestrate complex, multi-tenant enterprise workflows without risking data duplication or privacy leaks.

---

## 2. Architecture & Transport
*   **Transport Layer**: Streamable HTTP (SSE) for real-time Outbox event streaming; `stdio` for local CLI agent integration.
*   **Protocol Version**: MCP `2024-11-05` (Draft) with Ataqu-specific extensions for multi-tenancy.
*   **State Management**: Tools are inherently stateless but respect Ataqu's Optimistic Concurrency Control (OCC) via `If-Match` ETags and `Idempotency-Key` headers passed through the MCP `meta` field.

---

## 3. Security, Multi-Tenancy & PII (AEGIS Integration)
Ataqu MCP v4 strictly enforces the **AEGIS** security model.
*   **Authentication**: MCP server initialization requires an Ataqu Bearer Token or API Key. The `tenant_id` is cryptographically bound to the session.
*   **PII Redaction (Capability-Based)**: By default, all MCP Resources and Tool outputs serialize `Email` and `PhoneNumber` as `[REDACTED]`. 
    *   *v4 Enhancement*: AI agents can request a temporary `PiiAccessKey` via the `aegis_request_pii_access` tool, which logs the audit trail to `core.audit_logs` and grants a 5-minute decryption capability for specific contextual operations.
*   **Row-Level Security (RLS)**: The MCP server connects to the database using the `dispatcher_role` or tenant-specific roles, ensuring AI agents cannot query cross-tenant data.

---

## 4. Resources (Context & State)
Resources provide read-only, hierarchical URIs for AI agents to build context.

| URI Pattern | Module | Description |
| :--- | :--- | :--- |
| `ataqu://crm/contacts/{id}` | **CINQ** | Contact details, lead score, and custom fields. |
| `ataqu://crm/deals/pipeline` | **CINQ** | Current deal stages and win probabilities. |
| `ataqu://chat/channels/{id}/thread` | **DIAL** | Message history, mentions, and presence status. |
| `ataqu://hr/employees/{id}/leave` | **PAUSE** | Leave balances, pending requests, and documents. |
| `ataqu://docs/{id}/blocks` | **PIVOT** | Notion-style document blocks and relations. |
| `ataqu://inventory/variants/low-stock`| **VAULT** | Variants below the `LOW_STOCK_THRESHOLD`. |
| `ataqu://analytics/kpis` | **VISTA** | Aggregated cross-app metrics (Revenue, Pipeline, Bookings). |
| `ataqu://system/health` | **CORE** | Outbox lag, DB pool health, and SPARK DLQ depth. |

---

## 5. Tools (Actions & Orchestration)
Tools are mapped directly to Ataqu's Application Services. v4 introduces **Idempotency-Aware Wrappers**, meaning the AI agent doesn't need to manually generate idempotency keys; the MCP server handles the `core.idempotency_records` lifecycle automatically.

### 5.1 CRM & Sales (CINQ)
*   `cinq_search_contacts`: Semantic and cross-field JSONB search.
*   `cinq_create_deal`: Creates a deal and automatically emits a `DealCreated` outbox event for VISTA to update pipeline metrics.
*   `cinq_log_activity`: Logs calls/meetings.

### 5.2 Communication (DIAL)
*   `dial_send_message`: Posts to a channel. Automatically handles `@mentions` and triggers WebSocket broadcasts.
*   `dial_search_messages`: Vector/ILIKE search across authorized channels.

### 5.3 Automation (SPARK)
*   `spark_create_workflow`: Allows the AI to define JSON-based Triggers, Conditions, and Actions (e.g., "When Deal Won -> Create DIAL Channel -> Adjust VAULT Stock").
*   `spark_trigger_workflow`: Manually executes a workflow with a payload.

### 5.4 Inventory & Ops (VAULT & TEMPO)
*   `vault_adjust_stock`: Atomically updates stock using `SAVEPOINT` fallback logic to prevent negative inventory.
*   `vault_reserve_stock`: Places a 15-minute hold on inventory for checkout flows.
*   `tempo_check_availability`: Queries `collab_ops.availability_slots` for scheduling.
*   `tempo_create_booking`: Books a slot and emits a `TempoBookingCreatedForContact` event to link with CINQ.

### 5.5 Analytics (VISTA)
*   `vista_query_cross_app`: Executes materialized view queries (e.g., `cross_app_revenue_inventory`).
*   `vista_drill_down`: Fetches raw data points for a specific metric and dimension.

---

## 6. Prompts (AI Workflows)
Pre-configured prompt templates that combine multiple tools into standardized enterprise workflows.

### `ops-weekly-review`
> **System Prompt**: "You are the Ataqu Ops Assistant. Fetch the VISTA KPIs, identify any VAULT low-stock alerts, and summarize the pending PAUSE leave requests for the week. Draft a DIAL message to the `#ops-alerts` channel with the summary."
> **Tools Invoked**: `vista_query_cross_app`, `vault_get_low_stock`, `pause_list_leave_requests`, `dial_send_message`.

### `crm-lead-to-onboarding`
> **System Prompt**: "A new enterprise lead just closed. Generate a PIVOT onboarding document from the template, create a DIAL channel for the client, and trigger the SPARK 'New Client Setup' workflow."
> **Tools Invoked**: `pivot_apply_template`, `dial_create_channel`, `spark_trigger_workflow`.

---

## 7. v4 Synthesis Features (The "Magic")

### 7.1 Outbox Event Streaming (MCP Notifications)
Instead of polling, the MCP v4 server subscribes to PostgreSQL `LISTEN outbox_event`. When a background worker processes an event (e.g., a Shopify sync updates VAULT stock, or a TEMPO booking is cancelled), the MCP server pushes an **MCP Notification** to the connected AI agent. This allows agents to maintain real-time state without consuming API rate limits.

### 7.2 Transactional Tool Chaining
If an AI agent calls a sequence of tools (e.g., `cinq_create_deal` -> `vault_reserve_stock`), v4 wraps the execution in an Ataqu `IdempotencyGuard`. If the LLM hallucinates or the network drops, the AI can safely retry the exact same tool call with the same `meta.transaction_id`, and Ataqu will return the cached `200 OK` response from `core.idempotency_records` without duplicating the deal or double-reserving stock.

### 7.3 Automated Audit Trail
Every tool invocation via MCP is automatically intercepted by the `audit_repo`. The AI agent's ID, the tool name, the input payload, and the resulting state change are written to the partitioned `core.audit_logs` table. This provides enterprise compliance and allows administrators to query "What did the AI do?" via the `aegis_get_audit_logs` tool.

### 7.4 GDPR Saga Initiation
AI agents can trigger compliance workflows. Calling `aegis_request_gdpr_deletion` initiates the `GdprSagaStarter`, which asynchronously cascades through all modules (Anonymizing CINQ contacts, deleting PIVOT docs, purging DIAL messages) via the Saga state machine, reporting progress back to the agent via MCP Notifications.
