# TASK-019: Domain: PAUSE Pure Logic

## Execution Boundaries
 - `crates/ataqu-domain-pause/src/*`

## Step-by-Step Implementation Details
 1. Implement pure functions for employees, leave requests, approvals.
2. Define `PauseRepository` trait.
3. Implement logic to emit `EmployeeCreatedV1` events for CINQ projection.
4. NO I/O or async.

## Success Criteria & Verification
 - [ ] Functions compile.
- [ ] `EmployeeCreatedV1` event is generated on creation.
