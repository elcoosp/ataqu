# TASK-072: CINQ Multi-Context Establishments

## Objective
Allow a CINQ Company to have multiple Establishments (different SIRET/address), selectable at transaction time when creating a Deal.

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000015_create_establishments.rs` (overwrite)
- `crates/ataqu-domain-cinq/src/establishment.rs` (overwrite)
- `crates/ataqu-domain-cinq/src/repository.rs` (modify)
- `crates/ataqu-domain-cinq/src/deal.rs` (modify)
- `crates/ataqu-infra-repositories/src/cinq_repo_impl.rs` (modify)
- `crates/ataqu-application/src/cinq_service.rs` (modify)
- `crates/ataqu-api/src/handlers/cinq.rs` (modify)

## Step-by-Step Implementation Details

1. **Create migration**
   Add `collab_crm.establishments` table and add `establishment_id` column to `collab_crm.deals`.

2. **Define domain entity**
   In `establishment.rs`, define `Establishment` struct with `id`, `tenant_id`, `company_name`, `siret`, `address`, `created_at`, `updated_at`.

3. **Update `Deal` domain entity**
   Add `establishment_id: Option<Uuid>` to `Deal` and `CreateDealCommand`.

4. **Add repository trait**
   Define `EstablishmentRepository` with `save_establishment` and `list_establishments`.

5. **Implement repository**
   In `cinq_repo_impl.rs`, implement the trait using SeaORM.

6. **Extend `CinqService`**
   Add `create_establishment` and `list_establishments`.

7. **Add API handlers**
   Add `POST /establishments` and `GET /establishments`.

## Success Criteria & Verification
- [ ] Migration runs and adds columns.
- [ ] Domain entities compile.
- [ ] Repository methods return correct data.
- [ ] Service methods respect idempotency and tenant isolation.
- [ ] API endpoints respond with 201/200 and correct JSON.
- [ ] `cargo check --workspace` passes.
