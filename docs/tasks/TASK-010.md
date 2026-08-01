# TASK-010: ataqu-infra-repositories: Generic Batch Helper

## Execution Boundaries
 - `crates/ataqu-infra-repositories/src/generic_batch.rs`

## Step-by-Step Implementation Details
 1. Implement `transactional_batch_insert<T, F, Fut>(txn, items, chunk_size, insert_fn)` (ADR-014).
2. T must be `Identifiable + Clone + Send + Sync`.
3. For each chunk: `SAVEPOINT chunk_sp`, call insert_fn.
4. On error: immediately `ROLLBACK TO SAVEPOINT chunk_sp`. Classify error via `extract_db_err`.
5. If transient error, return `Err` immediately (clean txn). If data violation, loop 1-by-1.
6. On 1-by-1 failure, clone item into `DLQEntry::new(item.clone(), repo_err)`.

## Success Criteria & Verification
 - [ ] `ROLLBACK TO SAVEPOINT` executes before error classification.
- [ ] Transient errors abort immediately.
- [ ] DLQ entries contain the full cloned payload.
