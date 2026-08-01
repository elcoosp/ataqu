# TASK-016: Domain: TEMPO Pure Logic

## Execution Boundaries
 - `crates/ataqu-domain-tempo/src/*`

## Step-by-Step Implementation Details
 1. Implement pure functions for bookings, availability, event types.
2. Define `TempoRepository` trait.
3. Implement pure logic for no-show detection (sargable ends_at with 24-hour upper bound, ADR-032).
4. NO I/O or async.

## Success Criteria & Verification
 - [ ] Functions compile.
- [ ] No-show query logic is bounded.
