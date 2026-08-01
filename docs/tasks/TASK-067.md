# TASK-067: Tests: k6 Load Testing

## Execution Boundaries
 - `scripts/k6/loadtest.js`

## Step-by-Step Implementation Details
 1. Write k6 scripts for auth, CRM CRUD, chat messages, workflow execution.\n2. Simulate 200 concurrent users.\n3. Validate resource bounds: max 35 DB connections, memory < 2GB.\n4. Assert p99 latency < 200ms.

## Success Criteria & Verification
 - [ ] k6 scripts run successfully.\n- [ ] p99 latency is < 200ms.\n- [ ] No OOM or pool exhaustion.
