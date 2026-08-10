# Ataqu All-in-One MCP Server — Revised Blueprint v2
*Incorporating Creative Squad insights: Carson · Maya · Victor · Dr. Quinn · Sophia*

---

## Positioning

> **"The only MCP server where AI actions are first-class citizens of the permission, audit, and event architecture."**

This is not an API wrapper. This is the first AI colleague whose every action is written in the company's ledger. Your suite already has a heartbeat — the outbox. The MCP server is how AI learns to listen.

---

## 1. Delegation Tiers (The Pricing Model)

Instead of pricing by API calls or tool count, price by **trust level**. This is the product.

| Tier | Name | Available Tools | Approval Mode |
|------|------|----------------|---------------|
| **Tier 1** | Analyst | Read-only: `*.list_*`, `*.get_*`, `*.search_*`, `vista.*`, `unified_search`, `morning_brief` | None needed |
| **Tier 2** | Operator | + Create/update tools, `morning_brief` with suggested actions, `explain_this_number` | Every mutation posts to `#ai-proposals` DIAL channel; human reacts ✅ to execute |
| **Tier 3** | Autonomous | + Batch operations, SPARK workflow creation/triggering, cross-app orchestration | Confidence budget governs auto-execute vs. propose; `undo_last_action` always available |

**Key insight (Victor):** The tier *is* the product. Solo Sam starts at Tier 1, graduates to Tier 2 as trust builds. The upgrade path is the revenue path.

---

## 2. MCP Protocol Surface

### 2.1 Tools (namespaced, role-filtered)

Every app's operations exposed as MCP tools. The model **never sees tools the user's role doesn't allow** (Dr. Quinn — Prior Action principle).

| Namespace | Example Tools | Tier |
|-----------|--------------|------|
| `platform.*` | `morning_brief`, `get_360_view`, `unified_search`, `explain_this_number`, `get_capabilities`, `get_audit_log`, `undo_last_action`, `subscribe_events`, `claim_task`, `release_task`, `observe_pattern` | 1–3 |
| `aegis.*` | `list_users`, `create_user`, `update_role`, `create_api_key`, `get_permission_matrix` | 1–3 |
| `cinq.*` | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `search_contacts`, `list_deals`, `create_deal`, `update_deal`, `create_task`, `import_csv` | 1–3 |
| `dial.*` | `list_channels`, `get_channel`, `send_message`, `search_messages`, `create_channel` | 1–2 |
| `pause.*` | `list_employees`, `get_employee`, `request_leave`, `approve_leave`, `reject_leave` | 1–2 |
| `pivot.*` | `list_docs`, `get_doc`, `create_doc`, `update_doc`, `search_docs`, `apply_template` | 1–2 |
| `sond.*` | `list_forms`, `get_form`, `create_form`, `submit_response`, `export_responses` | 1–2 |
| `spark.*` | `list_workflows`, `get_workflow`, `create_workflow`, `trigger_workflow`, `approve_run`, `compile_from_nl` | 2–3 |
| `tempo.*` | `list_bookings`, `get_booking`, `create_booking`, `reschedule`, `list_availability` | 1–2 |
| `vault.*` | `list_products`, `get_variant`, `update_stock`, `reserve_stock`, `get_low_stock`, `simulate_stock_cut` | 1–3 |
| `vista.*` | `get_kpis`, `get_data_points`, `drill_down`, `combine_data` | 1 |
| `gdpr.*` | `request_deletion`, `get_saga_status`, `preview_deletion`, `conversational_gdpr` | 3 (admin) |

### 2.2 Resources (read-only data)

```
ataqu://tenants/{id}/kpis
ataqu://tenants/{id}/contacts?limit=20
ataqu://tenants/{id}/deals?status=won
ataqu://tenants/{id}/low-stock
ataqu://tenants/{id}/pending-leave
ataqu://tenants/{id}/workflows
ataqu://tenants/{id}/dashboards
ataqu://tenants/{id}/ai-memory          ← Sophia's sidecar, accumulates from day 1
ataqu://tenants/{id}/morning-brief       ← Cached latest brief
ataqu://changelog/latest                 ← AI can answer "what changed last week?"
ataqu://health/status                    ← Reuses existing health_service
```

### 2.3 Prompts (reusable workflow templates)

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

## 3. Cross-App "Superpower" Tools

These are the differentiators. No single API endpoint can do these.

### 3.1 `platform.morning_brief` ⭐ Phase 1 flagship

**Why first (Maya):** Read-only, emotionally resonant, teaches you which cross-app questions users actually ask. The demo that sells itself.

```json
{
  "tool": "platform.morning_brief",
  "params": { "tone": "concise", "max_items": 5 }
}
```

**Implementation:** Reads VISTA KPIs + CINQ at-risk deals + VAULT low stock + PAUSE pending leave + TEMPO upcoming bookings. Composes one DIAL message. Every bullet ends with a suggested action.

**Backed by:** A SPARK `Trigger::Schedule` cron workflow (your `poll_scheduled_triggers` already exists). No new infrastructure needed.

**Success metrics (Maya):**
- Brief open rate (DIAL read receipts) > 70% daily
- Suggested action acceptance > 25%
- Time-to-answer for cross-app questions < 15s vs ~20min baseline

### 3.2 `platform.get_360_view`

Given any entity (contact, employee, product, booking), pull their data across ALL apps in one call.

```json
{
  "tool": "platform.get_360_view",
  "params": { "entity_type": "contact", "entity_id": "uuid" }
}
```

**Returns:** contacts → deals (CINQ) + bookings (TEMPO) + DIAL mentions + PIVOT docs + SOND responses + VAULT reservations + PAUSE leave overlaps. One synthesized answer with sources.

**Time-travel extension (Carson):** `get_360_view(entity, at: "2026-07-01")` reconstructs state from `audit_logs` old/new values.

### 3.3 `platform.explain_this_number` ⭐ New

Point at any KPI value and walk the chain: KPI → `aggregated_views` → outbox events → source rows.

```json
{
  "tool": "platform.explain_this_number",
  "params": { "metric": "total_revenue", "period": "2026-07" }
}
```

**Implementation:** Calls `vista.get_data_points` → `vista.drill_down` → maps to `cinq.list_deals(status=won)`. Kills the "where does this number come from?" meeting forever.

### 3.4 `platform.find_related` ⭐ New (Carson)

Reverse of unified_search. Given an entity, surface everything linked to it across apps.

```json
{
  "tool": "platform.find_related",
  "params": { "entity_type": "deal", "entity_id": "uuid" }
}
```

### 3.5 `spark.compile_from_nl` ⭐ Phase 2 highest-leverage

Natural language → SPARK workflow definition. The AI compiles the request into your existing `Trigger` + `Condition` + `Action` JSON structures, presents it for one-click approval, then calls `spark.create_workflow`.

```json
{
  "tool": "spark.compile_from_nl",
  "params": { "description": "every Friday, email me low stock + pending leave" }
}
```

**Returns:** Proposed workflow JSON → user approves → `spark.create_workflow` executes.

### 3.6 `platform.observe_pattern` (Shadow Mode) ⭐ Phase 3

Reads the last 100 `audit_logs` entries, detects repeated sequences (user always creates contact → deal → booking), and proposes a SPARK workflow that automates it.

**Implementation:** Query `audit_logs` with `app` and `action` filters, group by `user_id` + time window, find sequences with frequency > threshold. Propose via DIAL message.

### 3.7 `platform.execute_cross_app_workflow`

A single tool that chains operations atomically across apps, leveraging your existing outbox pattern for eventual consistency.

```json
{
  "tool": "platform.execute_cross_app_workflow",
  "params": {
    "steps": [
      { "tool": "cinq.create_contact", "params": {}, "output": "$contact" },
      { "tool": "tempo.create_booking", "params": { "contact_id": "$contact.id" } },
      { "tool": "dial.send_message", "params": { "content": "Welcome $contact.name!" } },
      { "tool": "spark.trigger_workflow", "params": { "workflow_id": "...", "payload": { "contact": "$contact" } } }
    ]
  }
}
```

### 3.8 `vault.simulate_stock_cut` (What-if Sandbox) ⭐ New

Dry-run as a first-class *query*, not just a mutation guard.

```json
{
  "tool": "vault.simulate_stock_cut",
  "params": { "variant_id": "uuid", "delta": -20 }
}
```

**Returns:** `"would_trigger": ["LowStockAlert"], "would_affect": ["3 open deals"], "new_quantity": 5` — without writing anything.

### 3.9 `platform.undo_last_action` ⭐ Phase 1 trust tool

Reads the last `mcp.*` audit entry, inverts it using `old_value`, and applies the inverse operation.

```json
{
  "tool": "platform.undo_last_action",
  "params": { "scope": "last_mcp_action" }
}
```

**Why Phase 1 (Carson/Dr. Quinn):** Too high undo rate = trust problem. Zero undo usage = suspicion. This is the business model's insurance policy.

---

## 4. Security & Governance

### 4.1 Tenant-Scoped Sessions (Architectural Law)

Tenant context is the **outermost wrapper**. No tool accepts `tenant_id` as a parameter — it's *always* derived from the session. Your existing `TenantId` newtype (private field!) and RLS already enforce this at the type level. The MCP layer must never break that seal.

### 4.2 Permission-Aware Tool Exposure

Wire `core.permissions` matrix directly into tool visibility:

| User Role | Tool Access |
|-----------|-------------|
| `viewer` | Only `*.list_*`, `*.get_*`, `*.search_*`, `vista.*` |
| `editor` | + create/update tools |
| `admin` | + delete, GDPR, workflow management, raw SQL (disabled) |
| `mcp_analyst` (Tier 1) | Read-only subset |
| `mcp_operator` (Tier 2) | + mutations with approval gates |
| `mcp_autonomous` (Tier 3) | + batch, cross-app orchestration |

The model **never knows tools it can't use exist**. Prompt injection can't escalate what's invisible.

### 4.3 Idempotency Built-In

Every mutating MCP tool accepts an optional `idempotency_key`. Reuses your existing `IdempotencyGuard` + advisory lock infrastructure.

### 4.4 Audit Trail

Every MCP tool call writes to `core.audit_logs` with:
- `action`: `mcp.{tool_name}`
- `user_agent`: MCP client identifier
- `metadata`: `{ "mcp_session_id": "...", "model": "...", "tier": "..." }`

### 4.5 Confidence Budget ⭐ New (Dr. Quinn)

A self-throttling trust mechanism:

```
If undo_rate(tenant, 7d) > 10% OR conflict_rate(tenant, 7d) > 20%:
    → Auto-downgrade tenant from execute-mode to propose-mode
    → Notify via DIAL: "I've switched to proposal mode for safety"
    
If undo_rate(tenant, 7d) < 2% AND acceptance_rate > 80%:
    → Suggest upgrade to next delegation tier
```

### 4.6 `McpActionExecuted` Meta-Event ⭐ New (Dr. Quinn)

Every MCP action emits an outbox event *about itself*:

```json
{
  "schema": "core",
  "event_type": "McpActionExecuted",
  "payload": {
    "tool": "cinq.create_contact",
    "tenant_id": "...",
    "user_id": "...",
    "mcp_session_id": "...",
    "tier": "operator",
    "result": "success"
  }
}
```

This lets SPARK build **meta-workflows** on top of AI behavior — e.g., "if AI creates 5+ contacts in an hour, notify admin."

### 4.7 Rate Limiting

Reuse existing `RateLimiter` with MCP-specific keys:

```
mcp:{tenant_id}:{tool_namespace}  → different limits per tier
mcp:{tenant_id}:cross_app         → stricter (expensive operations)
mcp:{tenant_id}:batch             → strictest
```

### 4.8 Dangerous Operation Gating

| Tool | Gate |
|------|------|
| `gdpr.request_deletion` | Returns preview + requires `confirm: true` |
| `vault.bulk_adjust_stock` | Returns diff preview first |
| `aegis.deactivate_user` | Requires `reason` field |
| `spark.compile_from_nl` | Requires explicit approval before creating |
| Any destructive tool | Posts to `#ai-proposals` DIAL channel |

---

## 5. AI-Specific Enhancements

### 5.1 MCP Memory Resource ⭐ Phase 1 schema, Phase 3 logic

A persistent, per-tenant JSONB resource where the AI stores learned context:

```json
{
  "user_preferences": {
    "brief_time": "07:00",
    "brief_tone": "concise",
    "preferred_apps": ["cinq", "vault"]
  },
  "learned_patterns": [
    { "sequence": ["create_contact", "create_deal", "create_booking"], "frequency": 12 },
    { "suggested_workflow_id": "uuid", "status": "proposed" }
  ],
  "context_notes": [
    { "date": "2026-08-01", "note": "User prefers weekly not daily reports" }
  ]
}
```

**Why Phase 1 schema (Victor):** The moat compounds with usage. Start accumulating data immediately even if the logic comes later.

### 5.2 Progressive Disclosure (Dr. Quinn)

Don't dump 150 tools at once. `platform.get_capabilities` returns tools **for this user's role and recent activity**:

```json
{
  "tool": "platform.get_capabilities",
  "params": { "context": "current_session" }
}
```

Returns: top 5 most-relevant tools based on role + recent audit patterns. More tools unlock as usage patterns emerge.

### 5.3 Error Recovery Hints

When a tool fails, return structured error with suggested fix:

```json
{
  "error": "Version mismatch: expected 3, found 5",
  "suggestion": "Call cinq.get_contact to fetch current version, then retry with If-Match: 5",
  "retry_tool": "cinq.get_contact",
  "retry_params": { "id": "..." }
}
```

### 5.4 Streaming for Long Operations

- CSV imports (`cinq.import_csv`) — stream progress
- Cross-app searches — stream results as each app responds
- Workflow execution — stream step-by-step status
- `morning_brief` generation — stream each section as it's composed

### 5.5 Subscription with Conditions (Carson)

```json
{
  "tool": "platform.subscribe_events",
  "params": {
    "event_types": ["LowStockAlert", "DealWon", "LeaveRequestedEvent"],
    "conditions": {
      "LowStockAlert": { "variant_stock": { "<": 5 } },
      "DealWon": { "amount": { ">": 10000 } }
    }
  }
}
```

Filtered subscriptions = less noise = higher signal.

### 5.6 Multi-Agent Coordination (Carson)

```json
{ "tool": "platform.claim_task", "params": { "task_id": "..." } }
{ "tool": "platform.release_task", "params": { "task_id": "..." } }
```

Prevents two AI agents from double-acting. Your idempotency infra already half-solves this — expose it.

### 5.7 Changelog-Aware AI

Expose `changelog` as a resource so the AI can answer "what changed last week?" and adjust behavior after breaking changes. Your unread-changelog tracking is already built.

### 5.8 GDPR Conversational Mode (Carson)

AI asks "what data do we hold on alice@...?" and gets a policy-filtered answer assembled from the GDPR manifest tables — *never raw PII*. Compliance as a feature.

---

## 6. Approval Flow (The Trust Anchor)

Every risky action follows this flow:

```
AI proposes action
    → Preview posted to #ai-proposals DIAL channel
    → Human reacts ✅ (approve) or ❌ (reject) or 💬 (modify)
    → If ✅: MCP executes idempotently
    → Audit entry written
    → Confirmation message posted
    → If ❌: Action cancelled, logged
```

**Implementation:** Reuses your existing DIAL reaction system (`add_reaction`, `list_reactions`) + SPARK `Action::RequestApproval` + `approve_workflow_run`.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────┐
│              MCP Client (Claude, Cursor, Cline)         │
└──────────────────────────┬──────────────────────────────┘
                           │ MCP Protocol (stdio/SSE)
┌──────────────────────────▼──────────────────────────────┐
│               ataqu-mcp-server (new crate)              │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Tool        │  │ Resource     │  │ Prompt         │ │
│  │ Registry    │  │ Provider     │  │ Templates      │ │
│  │ (role-      │  │ (ai-memory,  │  │ (morning-brief │ │
│  │  filtered)  │  │  kpis, etc.) │  │  lead-to-cash) │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│  ┌──────▼────────────────▼───────────────────▼────────┐ │
│  │            Auth & Permission Gate                  │ │
│  │   (JWT/API key → tenant + role → tool filtering)  │ │
│  │   (Delegation tier enforcement)                   │ │
│  └────────────────────┬──────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼──────────────────────────────┐ │
│  │          Confidence Budget Engine                 │ │
│  │   (undo rate, conflict rate → auto-downgrade)     │ │
│  └────────────────────┬──────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼──────────────────────────────┐ │
│  │         Cross-App Orchestrator                    │ │
│  │   (morning_brief, 360_view, execute_cross_app)   │ │
│  └────────────────────┬──────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼──────────────────────────────┐ │
│  │      Existing Application Services                │ │
│  │   (AegisService, CinqService, VaultService, etc.)│ │
│  └────────────────────┬──────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼──────────────────────────────┐ │
│  │              Outbox Event Mesh                    │ │
│  │   (McpActionExecuted meta-events)                │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Crate Structure

```
ataqu-mcp/
├── Cargo.toml              # depends on ataqu-application, ataqu-api, ataqu-kernel
├── src/
│   ├── lib.rs
│   ├── server.rs           # MCP protocol handler (stdio + SSE transport)
│   ├── auth.rs             # JWT/API key → tenant + role + tier resolution
│   ├── registry.rs         # tool/resource/prompt registry with permission filtering
│   ├── confidence.rs       # confidence budget engine
│   ├── memory.rs           # ai-memory resource (read/write)
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
│   │   └── gdpr.rs         # includes conversational_gdpr
│   ├── resources.rs        # read-only data exposure
│   ├── prompts.rs          # curated prompt templates
│   ├── streaming.rs        # SSE / progressive result delivery
│   ├── approval.rs         # DIAL reaction-based approval flow
│   └── audit.rs            # MCP-specific audit logging + McpActionExecuted
```

---

## 8. Revised Roadmap

### Phase 1 — Trust & Habit (Weeks 1–3)

| # | Deliverable | Why |
|---|-------------|-----|
| 1 | **`platform.morning_brief`** — SPARK cron → VISTA + CINQ + VAULT + PAUSE → DIAL message | The demo. The research tool. Read-only, zero risk. |
| 2 | **Auth gate + role-filtered tool registry** | Foundation. Model only sees tools the user's role allows. |
| 3 | **`platform.unified_search`** | Immediate utility. Reuses existing handler. |
| 4 | **`platform.get_audit_log(filter: "mcp.*")`** | "What did the AI do?" — the #1 trust tool. |
| 5 | **`platform.undo_last_action`** | Insurance policy. Makes every mutation reversible. |
| 6 | **`ai-memory` schema** (empty, but accumulating) | The moat starts compounding from day 1. |
| 7 | **`McpActionExecuted` meta-event** in outbox | Enables meta-workflows on AI behavior. |
| 8 | **`platform.get_capabilities`** with progressive disclosure | Solves the 150-tool overwhelm. |

**Gate before Phase 2:** First-success rate on single tools > 80%.

### Phase 2 — Cross-App Power (Weeks 4–7)

| # | Deliverable | Why |
|---|-------------|-----|
| 9 | **`platform.get_360_view`** | The "wow" factor. One question, all apps. |
| 10 | **`platform.explain_this_number`** | Kills the "where does this number come from?" meeting. |
| 11 | **`spark.compile_from_nl`** | Highest-leverage cross-app tool. NL → workflow. |
| 12 | **Approval flow via DIAL reactions** | The trust anchor for mutations. |
| 13 | **`platform.execute_cross_app_workflow`** | Atomic multi-app operations. |
| 14 | **Confidence budget engine** | Self-throttling trust. |
| 15 | **Filtered event subscriptions** | AI reacts to what matters, not everything. |

### Phase 3 — Autonomy & Learning (Weeks 8–12)

| # | Deliverable | Why |
|---|-------------|-----|
| 16 | **`platform.observe_pattern`** (Shadow Mode) | The retention feature. Suite learns from humans. |
| 17 | **`ai-memory` read/write logic** | Personalization compounds. |
| 18 | **Batch operations** (only after Phase 2 trust metrics met) | Scale. |
| 19 | **`vault.simulate_stock_cut`** (What-if sandbox) | Dry-run as query. |
| 20 | **Multi-agent coordination** (`claim_task`/`release_task`) | Multiple AI sessions, no conflicts. |
| 21 | **GDPR conversational mode** | Compliance as feature. |
| 22 | **`platform.find_related`** (reverse search) | Discover hidden connections. |

### Phase 4 — Polish & Launch (Weeks 13–16)

| # | Deliverable | Why |
|---|-------------|-----|
| 23 | **Streaming for long operations** | UX for imports, searches, workflow execution. |
| 24 | **Time-travel on `get_360_view`** | Reconstruct state from audit_logs. |
| 25 | **Changelog-aware AI** | AI adapts after breaking changes. |
| 26 | **Delegation tier upgrade prompts** | Revenue path. |
| 27 | **Launch narrative** (Sophia) | Before-After-Bridge story + morning brief video. |

---

## 9. Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| Morning brief open rate (DIAL read receipts) | > 70% daily | 1 |
| Suggested action acceptance rate | > 25% | 1 |
| Time-to-answer for cross-app questions | < 15s (vs ~20min baseline) | 1 |
| Undo usage rate | < 5% of AI actions | 1 |
| First-success rate on single tools | > 80% | 1 gate |
| 360 view usage per session | > 2x | 2 |
| NL→workflow compilation success rate | > 60% | 2 |
| Approval-to-execution time | < 30s | 2 |
| Shadow mode workflow adoption rate | > 15% | 3 |
| ai-memory entries per tenant | > 10 after 30 days | 3 |
| Tier upgrade conversion (1→2→3) | > 20% within 60 days | 4 |

---

## 10. Launch Narrative (Sophia)

### StoryBrand

- **Character:** Sam, running a business on 10 apps, drowning in tabs
- **Problem:** External: cross-app questions take 20 minutes. Internal: *"Am I missing something important?"* Philosophical: business software should work *for* you, not the reverse.
- **Guide:** Ataqu + AI — *"We built 10 apps with one event heartbeat. Now that heartbeat speaks to your AI."*
- **Plan:** ① Connect your AI → ② Get your first morning brief → ③ Approve, delegate, breathe
- **Call to action:** *"Ask your business a question."*
- **Failure avoided:** Another year of being the integration layer
- **Success:** *"One conversation runs the company."*

### Before-After-Bridge (for changelog)

**Before:** *"What's happening in my business?"* = open VISTA, CINQ, VAULT, PAUSE, DIAL. Cross-reference. Copy-paste. 20 minutes, cold coffee.

**After:** *"What's happening in my business?"* = one message. The AI reads the heartbeat of all 10 apps, composes three bullets, and suggests what to do next. Every action it takes is audited, reversible, and approved by you.

**Bridge:** The Ataqu MCP Server — your suite's event mesh, now an AI-native surface. Connect Claude, Cursor, or any MCP client. Your business just became conversational.

### Launch Video Arc

- **Act I — The Question:** 30-second video of Sam tab-switching. Ends on: *"There has to be a better way to ask."*
- **Act II — The Heartbeat:** Reveal the outbox. Show the MCP server listening. The morning brief arrives.
- **Act III — The Trust:** Sam watches an AI proposal land in DIAL, approves with a reaction, sees the audit entry, smiles. Tagline: *"Your business, one conversation — fully audited."*

---

## Summary: What Changed from v1

| Aspect | v1 (Original) | v2 (Revised) |
|--------|---------------|--------------|
| **Phase 1 flagship** | Auth gate + tool registry | `morning_brief` (read-only, emotional hook) |
| **Undo** | Not mentioned | Phase 1 trust tool |
| **Audit for AI** | Mentioned | `get_audit_log(filter: "mcp.*")` in Phase 1 |
| **Confidence budget** | Not mentioned | Phase 2 self-throttling mechanism |
| **`McpActionExecuted`** | Not mentioned | Phase 1 meta-event for SPARK |
| **ai-memory** | Not mentioned | Phase 1 schema, Phase 3 logic |
| **NL→workflow** | Not mentioned | Phase 2 highest-leverage tool |
| **Shadow mode** | Not mentioned | Phase 3 retention feature |
| **What-if sandbox** | Not mentioned | Phase 3 dry-run as query |
| **Pricing** | Not addressed | Delegation tiers (Analyst → Operator → Autonomous) |
| **Progressive disclosure** | Mentioned | Detailed: role + recent activity filtering |
| **Approval flow** | Mentioned | Detailed: DIAL reaction-based |
| **Success metrics** | None | 11 specific metrics across phases |
| **Launch narrative** | None | StoryBrand + Before-After-Bridge + video arc |
| **Positioning** | Generic | "First AI colleague whose every action is in the ledger" |

The one-line thesis: **You're not building an MCP server for a 10-app suite. You're building the first AI colleague whose every action is written in the company's ledger.**
