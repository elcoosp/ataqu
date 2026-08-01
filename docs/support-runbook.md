# 🎧 ATAQU SUPPORT RUNBOOK (AGENT TRAINING) — Version 1.5
### The "No-Bot" Protocol for Human-Centric Intervention

> **Executive Note:** Ataqu’s brand promises "Human support (24h SLA). Competitors have nonexistent support." This is not a marketing gimmick; it is our primary defensive moat. When a user is migrating their entire business stack off HubSpot or Slack, they are terrified. If they hit a roadblock and receive an automated chatbot response, they will churn immediately. This runbook trains Ataqu support agents to act as "Calm Facilitators"—technically competent, ruthlessly empathetic, and empowered to solve problems in one touch. We do not have a "Tier 1" that copy-pastes FAQs. Every support agent is a product expert.

---

## 1. THE SUPPORT PHILOSOPHY

### 1.1 The Core Rules
1.  **Zero Bots:** Automated chatbots are strictly forbidden for inbound support queries. If a user emails `support@ataqu.so` or messages in DIAL, a human reads it and replies.
2.  **The 24-Hour SLA:** All inbound tickets must receive a substantive, human-written response within 24 hours. "Substantive" means the agent has actually investigated the issue, not just said "We are looking into this."
3.  **One-Touch Resolution:** The goal is never to "close a ticket." The goal is to solve the user's problem in a single response. If a user has to ask a follow-up question because the first answer was vague, we have failed.

### 1.2 The Agent Identity
Ataqu support agents are not "Customer Success Managers" who read from scripts. They are Technical Facilitators. They understand the Rust + SeaORM 2.0 + raw SQL + PostgreSQL architecture, they know how the unified outbox with `LISTEN/NOTIFY`, RLS, type‑safe `schema` ENUM, and Column-Level Privileges works, and they can read a JSON payload. They speak to CTOs like peers, and to CEOs like competent operators.

---

## 2. THE TICKET TRIAGE MATRIX

Every inbound ticket is categorized by severity. Severity dictates the response time and the escalation path.

| Severity | Definition | Examples | Response Time | Action |
|----------|------------|----------|---------------|--------|
| **Urgent** | Data loss or complete app outage. | "My CINQ deals disappeared." / "DIAL is returning 500s." | < 2 hours | Escalate immediately to Engineering via PagerDuty (if SEV‑1) or Slack `#eng-oncall`. |
| **High** | Core feature broken, blocking work. | "My SPARK automation didn't trigger." / "CSV import failed." | < 8 hours | Agent investigates logs in Grafana or local `logs.db`. If it's a bug, file a GitHub issue and notify the user. |
| **Normal** | How‑to questions or minor UI issues. | "How do I connect CINQ to VAULT?" / "Can I change my billing date?" | < 24 hours | Agent provides a precise, step‑by‑step answer with screenshots. |

---

## 3. STANDARD OPERATING PROCEDURES (SOPs)

### SOP 1: The "Migration Headache" (Competitor Data Import)
**Scenario:** A user is trying to import a CSV from HubSpot or Notion, and the Ataqu parser rejects it.
**The Playbook:**
1.  **Acknowledge the pain:** "HubSpot's CSV exports are notoriously messy. Let's get this sorted."
2.  **Request the file:** Ask the user to attach the CSV (or a sample of 10 rows).
3.  **Investigate:** Open the CSV. Look for missing headers, weird encoding (UTF‑8 vs. Windows‑1252), or malformed dates. Check the Rust/SeaORM parser logs in Grafana or `logs.db` for the exact rejection reason. The CSV processor uses the generic `transactional_batch_insert` helper which preserves the full row payload in the DLQ on data violations.
4.  **Fix or Format:** If it's a data issue, manually format the CSV for them and re‑upload it. If it's a parser bug, file a GitHub issue, manually import the data for them via a SeaORM script, and tell them it's done.
5.  **The Follow-up:** "I've imported your 500 deals into CINQ. You're ready to cancel HubSpot. Let me know if you need help with the cancellation process."

### SOP 2: The "Zapier Replacement" (SPARK Failure) and TEMPO No-Show Issues
**Scenario:** A user says, "My SPARK workflow didn't fire when a CINQ deal was won." Or "A TEMPO meeting was missed but no follow‑up email arrived."
**The Playbook:**
1.  **Verify the event:** Query the `core.outbox` table for that `tenant_id` and `event_type = 'CinqDealWonV1'` (or `TempoNoShowDetectedV1`). Did the event enter the outbox? (Use `psql` with SeaORM entity models). Ensure the `schema` column matches the expected ENUM value (e.g., `'collab_crm'`).
2.  **Check the relay:** If the event is stuck in `pending`, the outbox dispatcher with `LISTEN/NOTIFY` may have missed the `NOTIFY` signal, or RLS/Column-Level Privileges may be misconfigured. Check the safety-net poll logs. Escalate to Engineering.
3.  **Check the consumer:** If the event was dispatched, check the worker logs for panics or errors in `logs.db`.
4.  **For TEMPO specifically:** Check if the `MeetingJoined` WebSocket event was received. The `no_show_detected_total` metric includes a `reason` label (`attended_timeout` vs `hook_missed`). If many `hook_missed` events appear, the frontend WebSocket hook may be broken.
5.  **The Response:** "I checked the logs. The deal was won, but the SPARK workflow failed because the DIAL channel name contained an invalid character. I've fixed the workflow and re‑triggered it. You should see the DIAL channel now." Or "The no‑show was detected 12 minutes after the meeting ended, and the follow‑up email was sent. If you didn't receive it, check your spam folder."

### SOP 3: The "1-Click Cancel" (Churn/Refund Request)
**Scenario:** A user clicks "Cancel" and emails asking for a refund for the unused portion of the month.
**The Playbook:**
1.  **Zero Friction:** We do not argue, we do not offer bribes, we do not force them to call us.
2.  **Process immediately:** Issue a prorated refund via Stripe.
3.  **The Response:** "Your subscription is canceled, and a prorated refund of $XX has been issued. Your data export (CSV/JSON) is ready for download in the Admin panel. We appreciate you giving Ataqu a try. The door is always open."
4.  **The Feedback Loop:** Reply to the user's cancellation email with a single, plain‑text question: *"If you have 30 seconds, reply and tell us what sucked. No surveys, just raw truth."* Log this feedback in the product roadmap repo.

### SOP 4: GDPR Deletion Saga Issues
**Scenario:** A GDPR deletion has stalled or the user asks why their tenant hasn't been fully deleted.
**The Playbook:**
1.  **Check status:** Run `ataqu-admin gdpr status --tenant <tenant_id>`.
2.  **If the saga is `in_progress`:** Check the `next_retry_at` field. The system retries automatically with exponential backoff (1s, 5s, 30s, 2min, 10min). If it's within the backoff window, inform the user and wait.
3.  **If the saga is `deletion_failed`:** Investigate the specific step. The GDPR saga uses a compiled table registry (no runtime `information_schema` queries). If a table is missing from the registry, the saga cannot proceed. Ensure the registry is up-to-date. If the failure is due to S3 `NoSuchKey` (the object was already deleted in a previous retry), the saga treats this as success. Ensure the failure isn't something else (e.g., DB lock). Use `ataqu-admin gdpr retry --tenant <tenant_id>` to resume.
4.  **Escalation:** If manual retry fails, escalate to Engineering with the `step` and `failure_reason` from `gdpr_saga_state`.

### SOP 5: Idempotency Advisory Lock Timeouts
**Scenario:** A user reports a `503 Service Unavailable` with `Retry-After: 5` when submitting a request with a valid `Idempotency-Key`.
**The Playbook:**
1.  **Acknowledge:** "This error indicates a temporary processing conflict. It should resolve automatically."
2.  **Check logs:** Look for `"event":"idempotency_lock_timeout"` in the logs. If the same `command_id` appears repeatedly, there may be a long-running transaction or a collision with another request. The advisory lock uses `pg_advisory_xact_lock($1::int4, $2::int4)` with explicit casts.
3.  **Escalate:** If the user repeatedly encounters this, escalate to Engineering with the `command_id` and timestamps.

### SOP 6: Batch Ingestion Failure (CSV Import / DIAL Message Ingestion)
**Scenario:** A user reports a CSV import or DIAL message ingestion failed with a transient error.
**The Playbook:**
1.  **Acknowledge:** "I see the batch ingestion hit a temporary issue. The system rolled back the chunk and logged the error. Your data is safe."
2.  **Investigate:** Check logs for `"Chunk insert failed, attempting classification"`. The error will be classified:
    - **Transient/DB errors:** The helper rolls back the savepoint and aborts the chunk, preserving the transaction state. The caller (application layer) can retry the operation, and the idempotency layer will prevent duplicate processing.
    - **Data-level violations (unique, FK, check):** The helper falls back to 1-by-1 insertion, pushing the failing items to the DLQ. The DLQ entry contains the full cloned payload.
3.  **The Response:** If the error was transient: "The system encountered a temporary issue. Please retry the operation. If the problem persists, escalate to Engineering." If data-level violations: "We found some rows with invalid data. They have been quarantined. Please fix the following rows and retry."

---

## 4. THE SUPPORT LEXICON (Controlled Vocabulary)

Just like UX Writing, Support Agents must use precise, no‑bullshit language.

| ❌ Banned Support Phrases | ✅ Mandatory Support Phrases |
|---------------------------|------------------------------|
| "I'm sorry for the inconvenience." | "I understand this is blocking your work. Here is the fix:" |
| "Let me check with my team and get back to you." | "I'm querying the logs now. I will have an answer for you within the hour." |
| "Unfortunately, that feature is not currently available." | "We don't build that feature. Here is how you can achieve the same result using [Native App]." |
| "Are you sure you tried refreshing the page?" | "Can you send me a screenshot of the network tab so I can see the API response?" |
| "As a courtesy, I have issued a refund." | "I've issued a prorated refund. You should see it in 3‑5 days." |

---

## 5. THE ESCALATION PROTOCOL (When to pull in Engineering)

Support agents are technical, but they are not writing Rust code. If a ticket meets the following criteria, it must be escalated to the Engineering On‑Call.

1.  **Data Loss/Corruption:** If a user reports missing data that cannot be explained by user error (e.g., deals vanished after a SPARK workflow).
2.  **Repeated 500 Errors:** If a user sends a screenshot of an "Event logged to DLQ" error toast.
3.  **Outbox/Relay Bottlenecks:** If the agent notices widespread lag in the `core.outbox` table during troubleshooting.
4.  **GDPR Saga Failures:** If `gdpr retry` does not resolve the issue.
5.  **Advisory Lock Timeouts:** If lock timeouts persist for a specific command_id.
6.  **Batch Ingestion Persistent Failures:** If the same chunk repeatedly fails transiently.

**The Escalation Path:**
1.  Agent creates a GitHub Issue with the `bug` label.
2.  Agent posts the GitHub Issue link in the `#eng-oncall` Slack channel.
3.  Agent includes the `tenant_id`, `trace_id` (from the user's network tab), and a brief description of the failure.
4.  Engineering acknowledges within 1 hour (during business hours) or immediately (if SEV‑1).

---

## 6. MEASURING SUCCESS

We do not measure "Average Handle Time" (AHT). We do not rush users off the phone. We measure resolution quality and the decommission rate.

1.  **First Contact Resolution (FCR):** Percentage of tickets resolved in a single response. **Target: 70%+.**
2.  **CSAT (Customer Satisfaction):** Sent via a single‑click email after ticket closure. **Target: 4.8/5.**
3.  **The Decommission Rate (Support‑Assisted):** Percentage of support tickets that result in the user successfully migrating data and canceling a competitor subscription. **Target: 40%+.**

---

### FINAL SUPPORT DIRECTIVE
Ataqu support is the ultimate proof of our brand. When a user encounters a bug, they expect a chatbot. When a human engineer replies within 2 hours, reads their logs, fixes the data, and explains exactly what went wrong in the Rust + SeaORM + PostgreSQL architecture, that user becomes a loyalist for life. We do not view support as a cost center; it is our most effective Sales and Marketing engine.
