# TASK-019: Domain: PAUSE Pure Logic

## Execution Boundaries (STRICT)
 crates/ataqu-domain-pause/src/*

## Step-by-Step Implementation Details
 1. Implement pure functions for employees, leave requests, approvals.\n2. Define `PauseRepository` trait.\n3. Implement logic to emit `EmployeeCreatedV1` events for CINQ projection.\n4. NO I/O or async.

## Success Criteria & Verification
 - [ ] Functions compile.\n- [ ] `EmployeeCreatedV1` event is generated on creation.
