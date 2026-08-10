# Ataqu All-in-One MCP Server — Blueprint v3 (2026-07-28 Specification)

> **Incorporating the MCP 2026-07-28 Release Candidate:** stateless protocol core, Extensions framework, MCP Apps, Tasks, authorization hardening, and formal deprecation policy.

---

## Positioning

> **"The only MCP server where AI actions are first-class citizens of the permission, audit, and event architecture — now running statelessly at scale."**

The MCP 2026-07-28 specification is the largest revision of the protocol since launch. It removes sessions, eliminates the handshake, and enables true horizontal scaling. This blueprint rebuilds Ataqu's MCP server on the new stateless foundation while preserving the trust, audit, and delegation architecture that defines our differentiation.

**What this means for Ataqu:** Your MCP server can now run behind a plain round-robin load balancer, route traffic on the `Mcp-Method` header, and let clients cache `tools/list` responses for as long as the server's `ttlMs` permits. No sticky sessions. No shared session stores. No deep packet inspection at the gateway.

---

## 1. Delegation Tiers (The Pricing Model) — Unchanged

Instead of pricing by API calls or tool count, price by **trust level**.

| Tier | Name | Available Tools | Approval Mode |
|------|------|----------------|---------------|
| **Tier 1** | Analyst | Read-only: `*.list_*`, `*.get_*`, `*.search_*`, `vista.*`, `unified_search`, `morning_brief` | None needed |
| **Tier 2** | Operator | + Create/update tools, `morning_brief` with suggested actions, `explain_this_number` | Every mutation posts to `#ai-proposals` DIAL channel; human reacts ✅ to execute |
| **Tier 3** | Autonomous | + Batch operations, SPARK workflow creation/triggering, cross-app orchestration | Confidence budget governs auto-execute vs. propose; `undo_last_action` always available |

---

## 2. MCP Protocol Surface (2026-07-28)

### 2.1 Protocol Version & Headers

The MCP 2026-07-28 specification is **stateless at the protocol layer**. Every request is self-contained; any server instance can handle it.

**Required Headers:**

| Header | Value | Purpose |
|--------|-------|---------|
| `MCP-Protocol-Version` | `2026-07-28` | Protocol version |
| `Mcp-Method` | `tools/call`, `tools/list`, `server/discover`, etc. | Operation routing for load balancers |
| `Mcp-Name` | Tool name (e.g., `cinq.create_contact`) | Operation identification |
| `Authorization` | `Bearer <jwt>` or `OAuth 2.0` | Authentication |

**Request Example:**
```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: cinq.create_contact
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "cinq.create_contact",
    "arguments": { "name": "Acme Corp", "email": "contact@acme.com" },
    "_meta": {
      "io.modelcontextprotocol/clientInfo": { "name": "claude-desktop", "version": "1.0" },
      "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    }
  }
}
```

### 2.2 `server/discover` — Replaces the Handshake

The `initialize`/`initialized` handshake is **removed**. The protocol version, client info, and client capabilities now travel in `_meta` on every request.

A new `server/discover` method lets clients fetch server capabilities when needed up front.

**Discovery Request:**
```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: server/discover
```

**Discovery Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "capabilities": {
      "tools": { "listChanged": true },
      "extensions": {
        "io.modelcontextprotocol/apps": {},
        "io.modelcontextprotocol/tasks": {}
      }
    },
    "serverInfo": {
      "name": "ataqu-mcp",
      "version": "3.0.0"
    }
  }
}
```

### 2.3 Tools (namespaced, role-filtered, with cache hints)

Every tool response now carries `ttlMs` and `cacheScope` for caching hints.

**Tool Definition (MCP 2026-07-28):**
```json
{
  "name": "cinq.create_contact",
  "description": "Create a new contact in CINQ CRM. Returns the created contact with ID.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "company": { "type": "string" }
    },
    "required": ["name", "email"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  },
  "cacheHint": {
    "ttlMs": 300000,
    "scope": "user"
  }
}
```

**Full JSON Schema 2020-12 Support:** Tool `inputSchema` and `outputSchema` are now lifted to full JSON Schema 2020-12, supporting composition (`oneOf`, `anyOf`, `allOf`), conditionals, and references (`$ref`, `$defs`).

### 2.4 Resources (read-only data)

```
ataqu://tenants/{id}/kpis
ataqu://tenants/{id}/contacts?limit=20
ataqu://tenants/{id}/deals?status=won
ataqu://tenants/{id}/low-stock
ataqu://tenants/{id}/pending-leave
ataqu://tenants/{id}/workflows
ataqu://tenants/{id}/dashboards
ataqu://tenants/{id}/ai-memory
ataqu://tenants/{id}/morning-brief
ataqu://changelog/latest
ataqu://health/status
```

**Cache Hints on Resources:** All `resources/read` responses now carry `ttlMs` and `cacheScope`.

### 2.5 Prompts (reusable workflow templates) — Unchanged

| Prompt | Description |
|--------|-------------|
| `morning-brief` | Daily cross-app digest → DIAL message |
| `onboard-new-client` | contact → deal → booking → welcome message |
| `lead-to-cash` | SOND form → CINQ contact → CINQ deal → TEMPO booking → SPARK trigger |
| `weekly-ops-review` | KPIs + low stock + pending leave + failed workflows |
| `gdpr-handling` | Locate all tenant data → preview → execute saga |
| `shadow-workflow` | Analyze audit patterns → propose SPARK automation |
| `explain-number` | Point at any KPI → drill to source rows |

---

## 3. What Changes in the 2026-07-28 Specification

### 3.1 Stateless Protocol Core ✅

**Before (2025-11-25):**
```http
POST /mcp HTTP/1.1
{"jsonrpc":"2.0","id":1,"method":"initialize",...}
→ Mcp-Session-Id: 1868a90c...

POST /mcp HTTP/1.1
Mcp-Session-Id: 1868a90c...  ← Required on every request
{"jsonrpc":"2.0","id":2,"method":"tools/call",...}
```

**After (2026-07-28):**
```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: search
{"jsonrpc":"2.0","id":1,"method":"tools/call",...}  ← Self-contained, any instance can handle
```

The `Mcp-Session-Id` header and protocol-level sessions are **removed**. Any MCP request can land on any server instance.

**Impact on Ataqu:**
- No sticky routing required
- No shared session store required
- Horizontal scaling becomes trivial
- Deploy behind any standard load balancer

### 3.2 Stateless Protocol, Stateful Applications

Removing the protocol-level session **does not mean your application has to be stateless**. Servers that need to carry state across calls can use the **explicit handle pattern**: mint an identifier from a tool and have the model pass it back as an argument on later calls.

This pattern is often **more powerful** than hidden session state: the model can compose handles across tools, reason about them, and hand them off between steps.

**Example — Morning Brief with Context:**
```json
// First call: generate brief
{
  "method": "tools/call",
  "params": {
    "name": "platform.morning_brief",
    "arguments": { "tenant_id": "..." },
    "_meta": { "clientInfo": { "name": "claude" } }
  }
}
// Response returns a handle
{ "result": { "brief_id": "brf_123", "content": "...", "suggested_actions": [...] } }

// Later call: act on a suggestion using the handle
{
  "method": "tools/call",
  "params": {
    "name": "platform.execute_suggestion",
    "arguments": { "brief_id": "brf_123", "action_index": 0 }
  }
}
```

### 3.3 Server-to-Client Requests & Multi Round-Trip Requests

In a stateless protocol, servers still need to ask the client for something mid-call (e.g., an elicitation prompt). Two SEPs rebuild this flow:

1. **Server-initiated requests** may now only be issued while the server is actively processing a client request. A user is never prompted out of nowhere.

2. **Multi Round-Trip Requests** replace holding an SSE stream open. The server returns an `InputRequiredResult`:
```json
{
  "resultType": "input_required",
  "inputRequests": {
    "confirm": {
      "type": "elicitation",
      "message": "Delete 3 files?",
      "schema": { "type": "boolean" }
    }
  },
  "requestState": "eyJzdGVwIjoxLCJmaWxlcyI6WyJhIiwiYiIsImMiXX0="
}
```
The client gathers the answers and re-issues the original call with `inputResponses` and the echoed `requestState`. Any server instance can pick this up.

**Impact on Ataqu:** Approval flows (Section 6) now use this pattern instead of long-lived SSE streams.

### 3.4 Routable, Cacheable, Traceable

Three operational improvements:

| Feature | What Changed | Benefit |
|---------|--------------|---------|
| **Headers** | `Mcp-Method` and `Mcp-Name` are now required | Load balancers can route without inspecting body |
| **Caching** | `ttlMs` and `cacheScope` on list/resource results | Clients cache `tools/list`; less network traffic |
| **Tracing** | W3C Trace Context in `_meta` is documented | Distributed traces across SDKs and gateways |

### 3.5 Extensions Become First-Class

Extensions are now identified by reverse-DNS IDs, negotiated through an `extensions` map, live in their own `ext-*` repositories, and version independently.

**Ataqu will support two official extensions:**

### 3.6 MCP Apps: Server-Rendered User Interfaces

MCP Apps lets servers ship **interactive HTML interfaces** that hosts render in a sandboxed iframe.

**Key properties:**
- Tools declare their UI templates ahead of time so hosts can prefetch, cache, and security-review them
- The rendered UI talks back to the host over the same JSON-RPC base protocol
- Every UI-initiated action goes through the same audit and consent path as a direct tool call

**Ataqu MCP Apps:**
- `platform.morning_brief` → Rendered as a rich HTML dashboard with charts and action buttons
- Approval flows → Interactive UI with approve/reject/modify buttons
- `platform.get_360_view` → Expandable entity cards with cross-app data
- `platform.explain_this_number` → Drill-down UI with data tables

**Implementation:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "platform.morning_brief",
    "arguments": { "tone": "concise" }
  }
}
// Response includes a UI resource
{
  "result": {
    "content": [{ "type": "text", "text": "..." }],
    "_meta": {
      "ui": "ataqu://ui/morning-brief/brief_123"
    }
  }
}
// Client fetches the UI resource
GET ataqu://ui/morning-brief/brief_123
→ Returns HTML with embedded actions
```

### 3.7 Tasks Extension: Long-Running Work

Tasks shipped as an experimental core feature in 2025-11-25. Production use surfaced enough redesign that the right home is an **extension**.

**New lifecycle (stateless model):**
1. Server answers `tools/call` with a task handle
2. Client drives it with `tasks/get`, `tasks/update`, and `tasks/cancel`
3. Task creation is server-directed: client advertises the extension, server decides when a call should run as a task
4. `tasks/list` is removed (can't be scoped safely without sessions)

**Ataqu Tasks:**
- `vault.simulate_stock_cut` → Long-running simulation with progress updates
- `cinq.import_csv` → Large CSV import with progress streaming
- `platform.get_360_view` with `at` parameter → Historical reconstruction
- `platform.observe_pattern` → Pattern detection across audit logs
- `spark.compile_from_nl` → NL → workflow compilation

### 3.8 Authorization Hardening

Six SEPs harden authorization to align more closely with OAuth 2.0 and OpenID Connect deployments.

**Key requirements:**
- Clients must validate the `iss` parameter per RFC 9207
- Clients declare their OpenID Connect `application_type` during Dynamic Client Registration
- Clients bind registered credentials to the issuing authorization server's issuer
- MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata (RFC 9728)

**Ataqu implementation:**
```rust
// OAuth 2.0 Protected Resource Metadata endpoint
GET /.well-known/oauth-protected-resource
{
  "resource": "https://mcp.ataqu.com",
  "authorization_servers": ["https://auth.ataqu.com"],
  "scopes_supported": ["read", "write", "admin"],
  "bearer_methods_supported": ["header"]
}
```

### 3.9 Deprecations (12-Month Runway)

Three core features are **deprecated** under the new feature lifecycle policy (at least 12 months between deprecation and removal):

| Feature | Replacement |
|---------|-------------|
| **Roots** | Tool parameters, resource URIs, or server configuration |
| **Sampling** | Direct integration with LLM provider APIs |
| **Logging** | `stderr` for stdio transports; OpenTelemetry for structured observability |

**These remain functional** for at least 12 months. Ataqu's MCP server will not rely on these deprecated features.

### 3.10 Deprecated Transports

The older HTTP+SSE transport and Dynamic Client Registration are also deprecated.

**Ataqu will support:**
- **stdio** for local clients (Claude Desktop, Cursor, VS Code)
- **Streamable HTTP** for remote production deployment

---

## 4. The Stateless Ataqu MCP Server — Architecture

### 4.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Load Balancer (Round-Robin)                  │
│                    Routes on Mcp-Method header                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │ MCP Server 1 │ │ MCP Server 2 │ │ MCP Server 3 │
    │ (Stateless)  │ │ (Stateless)  │ │ (Stateless)  │
    └───────┬──────┘ └─────┬──────┘ └─────┬──────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
              ┌────────────▼────────────┐
              │   PostgreSQL (Shared)    │
              │   - core.outbox          │
              │   - idempotency_records  │
              │   - audit_logs           │
              └─────────────────────────┘
```

**Key properties:**
- No sticky sessions
- No shared session store
- Any instance can handle any request
- Horizontal scaling is trivial

### 4.2 Request Flow (Stateless)

```
1. Client → Load Balancer
   POST /mcp
   MCP-Protocol-Version: 2026-07-28
   Mcp-Method: tools/call
   Authorization: Bearer <jwt>

2. Load Balancer routes to any available MCP server instance

3. MCP Server:
   a. Validates JWT → extracts tenant_id, user_id, tier
   b. Looks up tool in registry (cached with ttlMs)
   c. Authorizes tool access based on tier + role
   d. Executes tool → calls application service
   e. Returns result with cache hints

4. Client caches tools/list response based on ttlMs
```

### 4.3 Caching Strategy

`tools/list`, `prompts/list`, `resources/list`, and `resources/read` responses now carry `ttlMs` and `cacheScope`.

| Resource | ttlMs | scope | Rationale |
|----------|-------|-------|-----------|
| `tools/list` (Tier 1) | 3600000 (1h) | `tenant` | Read-only tools change rarely |
| `tools/list` (Tier 2) | 600000 (10m) | `tenant` | Mutation tools change with user permissions |
| `tools/list` (Tier 3) | 60000 (1m) | `tenant` | Autonomous tools change frequently |
| `resources/list` | 300000 (5m) | `tenant` | Resources change with data |
| `server/discover` | 86400000 (24h) | `public` | Server capabilities are static |

### 4.4 Distributed Tracing

W3C Trace Context in `_meta` is now documented with fixed key names:

```json
{
  "_meta": {
    "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "tracestate": "congo=ucsd-20,"
  }
}
```

A trace that starts in a host application can follow a tool call through the client SDK, the MCP server, and whatever the server calls downstream, showing up as a single span tree in an OpenTelemetry-compatible backend.

---

## 5. Cross-App "Superpower" Tools (2026-07-28 Enhanced)

### 5.1 `platform.morning_brief` ⭐ Now with MCP Apps UI

**Before:** Returns text with suggested actions.
**After:** Returns text + UI resource for rich rendering.

```json
{
  "tool": "platform.morning_brief",
  "params": { "tone": "concise", "max_items": 5 }
}
```

**Response:**
```json
{
  "result": {
    "content": [{ "type": "text", "text": "..." }],
    "_meta": {
      "ui": "ataqu://ui/morning-brief/brief_123",
      "cacheHint": { "ttlMs": 300000, "scope": "tenant" }
    }
  }
}
```

**UI renders:**
- KPI cards (revenue, pipeline, stock alerts, pending leave)
- Suggested actions as clickable buttons
- Each button triggers a tool call via the host

### 5.2 `platform.get_360_view` — Now with Tasks for Historical Views

```json
{
  "tool": "platform.get_360_view",
  "params": { "entity_type": "contact", "entity_id": "uuid", "at": "2026-07-01" }
}
```

If the historical reconstruction takes > 2 seconds, returns a task handle:

```json
{
  "result": {
    "task": "task_456",
    "status": "running",
    "_meta": { "estimated_time_ms": 5000 }
  }
}

// Client polls:
GET /mcp?method=tasks/get&id=task_456
```

### 5.3 `platform.explain_this_number` — With MCP Apps Drill-Down

Returns text explanation + UI resource with drill-down table.

### 5.4 `spark.compile_from_nl` — Now with MCP Apps Approval UI

Returns a UI resource showing the proposed workflow JSON with Approve/Modify/Reject buttons.

### 5.5 `platform.observe_pattern` — Now with Tasks

Long-running pattern detection across audit logs returns a task handle with progress updates.

---

## 6. Approval Flow — Now with Multi Round-Trip Requests

Instead of holding an SSE stream open, the server returns an `InputRequiredResult`:

```json
{
  "resultType": "input_required",
  "inputRequests": {
    "approve_workflow": {
      "type": "elicitation",
      "message": "Approve this workflow?",
      "schema": {
        "type": "object",
        "properties": {
          "approved": { "type": "boolean" },
          "comment": { "type": "string" }
        },
        "required": ["approved"]
      }
    }
  },
  "requestState": "eyJ3b3JrZmxvd19pZCI6InV1aWQifQ=="
}
```

The client gathers the response and re-issues the call with `inputResponses`:

```json
{
  "method": "tools/call",
  "params": {
    "name": "spark.create_workflow",
    "arguments": { "workflow": {...} },
    "inputResponses": {
      "approve_workflow": { "approved": true }
    },
    "requestState": "eyJ3b3JrZmxvd19pZCI6InV1aWQifQ=="
  }
}
```

Any server instance can pick this up because everything it needs is in the payload.

---

## 7. Security & Governance (2026-07-28 Enhanced)

### 7.1 OAuth 2.0 Authorization

MCP 2026-07-28 requires OAuth 2.0 for remote servers.

**Ataqu OAuth endpoints:**
```
GET /.well-known/oauth-protected-resource          → RFC 9728 metadata
GET /.well-known/oauth-authorization-server        → RFC 8414 metadata
POST /oauth/token                                  → Token endpoint
```

**Client flow:**
1. Client discovers protected resource metadata
2. Client obtains access token from authorization server
3. Client includes token in `Authorization: Bearer` header
4. Server validates token, extracts tenant_id and user_id

### 7.2 Permission-Aware Tool Exposure — Unchanged

Wire `core.permissions` matrix directly into tool visibility. The model **never knows tools it can't use exist**.

### 7.3 Idempotency — Unchanged

Every mutating MCP tool accepts an optional `idempotency_key`. Uses `IdempotencyGuard` + advisory lock infrastructure.

### 7.4 Audit Trail — Now with Trace Context

Every MCP tool call writes to `core.audit_logs` with:
- `action`: `mcp.{tool_name}`
- `user_agent`: MCP client identifier
- `metadata`: `{ "mcp_session_id": "...", "model": "...", "tier": "...", "traceparent": "..." }`

### 7.5 Confidence Budget — Unchanged

### 7.6 `McpActionExecuted` Meta-Event — Unchanged

### 7.7 Rate Limiting — Now Routable by `Mcp-Method`

Rate limit by `Mcp-Method` header at the load balancer level:

```
mcp:{tenant_id}:tools/call          → 1000/min
mcp:{tenant_id}:tools/call:cinq.*    → 500/min
mcp:{tenant_id}:tools/call:cross_app → 50/min
mcp:{tenant_id}:tools/call:batch     → 10/min
```

### 7.8 Dangerous Operation Gating — Unchanged

---

## 8. AI-Specific Enhancements (2026-07-28 Enhanced)

### 8.1 MCP Memory Resource — Unchanged

### 8.2 Progressive Disclosure — Now with Cache Hints

`platform.get_capabilities` returns tools **for this user's role and recent activity** with `cacheHint: { ttlMs: 600000, scope: "user" }`.

### 8.3 Error Recovery Hints — Unchanged

### 8.4 Streaming for Long Operations — Now with Tasks

- CSV imports (`cinq.import_csv`) → Task with progress
- Cross-app searches → Task with streaming results
- Workflow execution → Task with step-by-step status
- `morning_brief` generation → Task with section-by-section completion

### 8.5 Subscription with Conditions — Unchanged

### 8.6 Multi-Agent Coordination — Unchanged

### 8.7 Changelog-Aware AI — Unchanged

### 8.8 GDPR Conversational Mode — Unchanged

---

## 9. Architecture (2026-07-28)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude, Cursor, Cline)           │
│                    - Discovers server capabilities              │
│                    - Caches tools/list with ttlMs              │
│                    - Sends trace context in _meta              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Streamable HTTP / stdio
                           │ MCP-Protocol-Version: 2026-07-28
                           │ Mcp-Method, Mcp-Name headers
┌──────────────────────────▼──────────────────────────────────────┐
│                    Load Balancer (Round-Robin)                  │
│                    Routes on Mcp-Method header                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
┌───────────▼──────────┐ ┌─▼────────────┐ ┌─▼────────────┐
│   MCP Server          │ │ MCP Server   │ │ MCP Server   │
│   (Stateless)         │ │ (Stateless)  │ │ (Stateless)  │
│                       │ │              │ │              │
│  ┌─────────────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│  │ Tool Registry    │ │ │ │ Tool     │ │ │ │ Tool     │ │
│  │ (cached, ttlMs) │ │ │ │ Registry │ │ │ │ Registry │ │
│  └─────────────────┘ │ │ └──────────┘ │ │ └──────────┘ │
│  ┌─────────────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│  │ Auth & Permission│ │ │ │ Auth &   │ │ │ │ Auth &   │ │
│  │ Gate             │ │ │ │ Permission│ │ │ │ Permission│ │
│  └─────────────────┘ │ │ └──────────┘ │ │ └──────────┘ │
│  ┌─────────────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│  │ Confidence       │ │ │ │Confidence│ │ │ │Confidence│ │
│  │ Budget Engine    │ │ │ │ Budget   │ │ │ │ Budget   │ │
│  └─────────────────┘ │ │ └──────────┘ │ │ └──────────┘ │
│  ┌─────────────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│  │ Cross-App        │ │ │ │Cross-App │ │ │ │Cross-App │ │
│  │ Orchestrator     │ │ │ │Orchestra-│ │ │ │Orchestra-│ │
│  └─────────────────┘ │ │ └──────────┘ │ │ └──────────┘ │
└───────────┬──────────┘ └──────┬───────┘ └──────┬───────┘
            │                   │                │
            └───────────────────┼────────────────┘
                                │
                   ┌────────────▼────────────┐
                   │   Shared PostgreSQL      │
                   │   - core.outbox          │
                   │   - idempotency_records  │
                   │   - audit_logs           │
                   │   - permissions          │
                   └─────────────────────────┘
```

### Crate Structure — Updated for Stateless MCP

```
ataqu-mcp/
├── Cargo.toml              # depends on ataqu-application, ataqu-api, ataqu-kernel
├── src/
│   ├── lib.rs
│   ├── server.rs           # MCP protocol handler (stdio + Streamable HTTP)
│   │                       # - No session state
│   │                       # - Validates MCP-Protocol-Version
│   │                       # - Routes on Mcp-Method header
│   │                       # - Handles Multi Round-Trip Requests
│   ├── auth.rs             # OAuth 2.0 + JWT → tenant + role + tier
│   │                       # - RFC 9728 Protected Resource Metadata
│   │                       # - RFC 8414 Authorization Server Metadata
│   ├── registry.rs         # tool/resource/prompt registry
│   │                       # - Returns ttlMs and cacheScope
│   │                       # - Full JSON Schema 2020-12 support
│   ├── discover.rs         # server/discover implementation
│   ├── extensions.rs       # MCP Apps + Tasks extension support
│   ├── apps.rs             # MCP Apps UI rendering
│   ├── tasks.rs            # Tasks extension (long-running work)
│   ├── elicitation.rs      # Multi Round-Trip Request handling
│   ├── confidence.rs       # confidence budget engine
│   ├── memory.rs           # ai-memory resource (read/write)
│   ├── cache.rs            # Response caching with ttlMs/scope
│   ├── tools/
│   │   ├── platform.rs     # cross-app: morning_brief, 360_view, explain_number, undo
│   │   ├── aegis.rs
│   │   ├── cinq.rs
│   │   ├── dial.rs
│   │   ├── pause.rs
│   │   ├── pivot.rs
│   │   ├── sond.rs
│   │   ├── spark.rs        # includes compile_from_nl
│   │   ├── tempo.rs
│   │   ├── vault.rs        # includes simulate_stock_cut
│   │   ├── vista.rs
│   │   └── gdpr.rs
│   ├── resources.rs        # read-only data with cache hints
│   ├── prompts.rs          # curated prompt templates
│   ├── streaming.rs        # Tasks-based streaming
│   ├── approval.rs         # Multi Round-Trip Request approval flow
│   └── audit.rs            # MCP-specific audit logging + McpActionExecuted
```

---

## 10. Revised Roadmap (2026-07-28 Compatible)

### Phase 1 — Stateless Foundation (Weeks 1–2)

| # | Deliverable | Why |
|---|-------------|-----|
| 1 | **Stateless MCP server** — No sessions, no handshake | Foundation for scaling |
| 2 | **`server/discover`** implementation | Replace `initialize` handshake |
| 3 | **`Mcp-Method`/`Mcp-Name` routing** | Load balancer compatibility |
| 4 | **Cache hints** (`ttlMs`, `cacheScope`) on all list responses | Reduce network traffic |
| 5 | **OAuth 2.0 Protected Resource Metadata** | RFC 9728 compliance |
| 6 | **W3C Trace Context in `_meta`** | Distributed tracing |
| 7 | **`platform.morning_brief`** with MCP Apps UI | The demo. Read-only, zero risk |
| 8 | **`platform.get_audit_log(filter: "mcp.*")`** | "What did the AI do?" — trust tool |

**Gate before Phase 2:** First-success rate on single tools > 80%.

### Phase 2 — Extensions (Weeks 3–5)

| # | Deliverable | Why |
|---|-------------|-----|
| 9 | **MCP Apps** — Server-rendered UI for morning brief, approvals, 360 view | Rich interactive experiences |
| 10 | **Tasks extension** — Long-running work (imports, simulations, pattern detection) | Non-blocking operations |
| 11 | **Multi Round-Trip Requests** — Approval flows without SSE | Stateless elicitation |
| 12 | **`platform.get_360_view`** | The "wow" factor |
| 13 | **`platform.explain_this_number`** | Kills the "where does this number come from?" meeting |
| 14 | **`spark.compile_from_nl`** | Highest-leverage cross-app tool |
| 15 | **Confidence budget engine** | Self-throttling trust |

### Phase 3 — Autonomy & Learning (Weeks 6–10)

| # | Deliverable | Why |
|---|-------------|-----|
| 16 | **`platform.observe_pattern`** with Tasks | Long-running pattern detection |
| 17 | **`ai-memory` read/write logic** | Personalization compounds |
| 18 | **Batch operations** with Tasks | Scale |
| 19 | **`vault.simulate_stock_cut`** with Tasks | What-if sandbox |
| 20 | **Multi-agent coordination** (`claim_task`/`release_task`) | Multiple AI sessions, no conflicts |
| 21 | **GDPR conversational mode** | Compliance as feature |
| 22 | **`platform.find_related`** | Discover hidden connections |

### Phase 4 — Polish & Launch (Weeks 11–14)

| # | Deliverable | Why |
|---|-------------|-----|
| 23 | **Full JSON Schema 2020-12 support** for tool schemas | Richer tool definitions |
| 24 | **Deprecation cleanup** — Remove Roots, Sampling, Logging dependencies | Future-proofing |
| 25 | **Delegation tier upgrade prompts** | Revenue path |
| 26 | **Launch narrative** | Before-After-Bridge story + morning brief video |

---

## 11. Migration from 2025-11-25 to 2026-07-28

### Breaking Changes

| 2025-11-25 | 2026-07-28 | Migration |
|-------------|------------|-----------|
| `initialize` handshake | `server/discover` | Remove handshake; use `discover` for capabilities |
| `Mcp-Session-Id` header | Removed | Remove session ID handling |
| Sticky sessions required | Round-robin load balancing | Deploy behind any LB |
| SSE for approvals | Multi Round-Trip Requests | Use `InputRequiredResult` |
| Tasks experimental (2025-11-25) | Tasks extension (2026-07-28) | Adopt new `tasks/get`/`tasks/update`/`tasks/cancel` lifecycle |
| Roots, Sampling, Logging | Deprecated | Migrate to replacements |
| HTTP+SSE transport | Streamable HTTP | Use Streamable HTTP |
| Error code -32002 | -32602 Invalid Params | Update error code handling |

### Backward Compatibility

The 2026-07-28 specification gives **12 months** between deprecation and removal. Ataqu's MCP server will:

1. Support both 2025-11-25 and 2026-07-28 clients during transition
2. Use `MCP-Protocol-Version` header to determine protocol version
3. Phase out 2025-11-25 support after 12 months

---

## 12. Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| Morning brief open rate | > 70% daily | 1 |
| Suggested action acceptance rate | > 25% | 1 |
| Time-to-answer for cross-app questions | < 15s | 1 |
| Undo usage rate | < 5% of AI actions | 1 |
| First-success rate on single tools | > 80% | 1 gate |
| 360 view usage per session | > 2x | 2 |
| NL→workflow compilation success rate | > 60% | 2 |
| Approval-to-execution time | < 30s | 2 |
| MCP Apps interaction rate | > 40% of briefs | 2 |
| Task completion rate | > 90% | 3 |
| Shadow mode workflow adoption | > 15% | 3 |
| ai-memory entries per tenant | > 10 after 30 days | 3 |
| Tier upgrade conversion | > 20% within 60 days | 4 |

---

## 13. Launch Narrative — Unchanged

### StoryBrand

- **Character:** Sam, running a business on 10 apps, drowning in tabs
- **Problem:** External: cross-app questions take 20 minutes. Internal: *"Am I missing something important?"* Philosophical: business software should work *for* you, not the reverse.
- **Guide:** Ataqu + AI — *"We built 10 apps with one event heartbeat. Now that heartbeat speaks to your AI — at scale."*
- **Plan:** ① Connect your AI → ② Get your first morning brief → ③ Approve, delegate, breathe
- **Call to action:** *"Ask your business a question."*
- **Failure avoided:** Another year of being the integration layer
- **Success:** *"One conversation runs the company."*

---

## Summary: What Changed from v2

| Aspect | v2 (2025-11-25) | v3 (2026-07-28) |
|--------|-----------------|-----------------|
| **Protocol state** | Session-based | Stateless |
| **Connection** | `initialize` handshake + `Mcp-Session-Id` | `server/discover`; no session ID |
| **Scaling** | Sticky sessions required | Round-robin load balancing |
| **Routing** | Body inspection | `Mcp-Method`/`Mcp-Name` headers |
| **Caching** | None | `ttlMs` + `cacheScope` on list responses |
| **Tracing** | Ad-hoc | W3C Trace Context in `_meta` |
| **Approvals** | SSE streams | Multi Round-Trip Requests |
| **UI** | Text/JSON only | MCP Apps (server-rendered HTML) |
| **Long-running work** | Blocking | Tasks extension |
| **Authorization** | Basic JWT | OAuth 2.0 + RFC 9728 metadata |
| **Tool schemas** | JSON Schema draft-07 | Full JSON Schema 2020-12 |
| **Deprecated features** | N/A | Roots, Sampling, Logging (12-month runway) |
| **Error codes** | -32002 | -32602 Invalid Params |

---

**The one-line thesis:** *You're not just building an MCP server for a 10-app suite. You're building the first AI colleague whose every action is written in the company's ledger — now running statelessly at any scale.*
