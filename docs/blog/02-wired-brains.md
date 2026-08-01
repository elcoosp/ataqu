Here is a new blog post, fresh from this afternoon's work. It focuses on the domain layer you just built—the pure, testable business logic that gives the 10 apps their actual brains—while keeping the tone direct and free of AI tells.

---

# We Just Wired the Brains of 10 SaaS Apps in One Afternoon: Pure Domain Logic in Rust

Last time, we built the nervous system: a unified PostgreSQL outbox with RLS, `LISTEN/NOTIFY`, and honest idempotency. That made apps communicate without Zapier. Today, we wired the brains—the actual business logic of 10 SaaS applications—into that infrastructure.

A few hours of focused work, and the domain crates for AEGIS, CINQ, DIAL, SPARK, SOND, PIVOT, TEMPO, VAULT, and VISTA are now complete. They contain pure functions, repository traits, and tests. They know nothing about PostgreSQL, SeaORM, or Tokio. They are just Rust, doing what they are told.

Here is how we built them.

---

## Pure Domain: No I/O, No System Clock, No RNG

Every domain crate follows a strict rule: no I/O, no system calls, no reading the system clock or random number generator. The functions take commands, generate IDs and timestamps via injected traits, and return events. That is it.

For example, in `ataqu-domain-aegis`, creating a user is a pure function:

```rust
pub fn create_user(
    cmd: CreateUserCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> UserCreated {
    let user_id = id_gen.new_uuid_v7();
    let now = clock.now();
    UserCreated { user_id, email: cmd.email, created_at: now }
}
```

The `IdGenerator` and `Clock` traits are defined in `ataqu-kernel`. In production, they produce UUIDv7 and `SystemTime`. In tests, we inject mocks that return deterministic values. No `Uuid::now_v7()` or `SystemTime::now()` appears anywhere in the domain crates. This makes tests fast, reproducible, and free of flaky timestamps.

---

## Repository Traits: Boundaries Defined at the Domain Level

Each domain defines its own repository traits. They describe what persistence operations are needed, but they do not mention SQL, connections, or async details. For instance, `ataqu-domain-cinq` defines:

```rust
pub trait ContactRepository: Send + Sync {
    fn save_contact(&self, contact: &Contact) -> impl Future<Output = CinqRepositoryResult<()>> + Send;
    fn find_contact_by_id(&self, tenant_id: &TenantId, id: Uuid) -> impl Future<Output = CinqRepositoryResult<Option<Contact>>> + Send;
    fn list_contacts(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> impl Future<Output = CinqRepositoryResult<Vec<Contact>>> + Send;
}
```

The infrastructure crate (`ataqu-infra-repositories`) will implement these using SeaORM and raw SQL. The domain layer does not care how the data is stored; it only knows what operations are available. This separation keeps the business logic isolated from database migrations, connection pools, and transaction management.

---

## Validation, Errors, and Domain-Specific Logic

Each domain crate includes its own error enums, validation logic, and business rules. For CINQ, we validate that a deal amount is positive, that a pipeline stage order is non-negative, and that contact names are not empty. For SOND, we validate form question options, rating ranges, and conditional visibility of questions. For DIAL, we enforce maximum message lengths, channel name restrictions, and the rule that direct messages require exactly two participants.

These validations are pure functions that return `Result` with domain errors. They are called before the domain functions produce events. For example, in `ataqu-domain-cinq/deal.rs`:

```rust
pub fn create_deal(
    cmd: CreateDealCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> CinqResult<DealCreated> {
    if cmd.amount <= 0.0 {
        return Err(CinqDomainError::InvalidAmount);
    }
    // ... generate id, timestamp, return event
}
```

No validation logic is duplicated in the application layer or the database. The domain enforces it first. The repository implementations assume the data is valid when they receive it.

---

## Comprehensive Tests with Deterministic Mocks

Every domain function has tests. They use mock implementations of `IdGenerator` and `Clock` to produce predictable outputs. For example, the DIAL crate tests sending a message, editing it, deleting it, and starting threads. The tests ensure that:

- Empty messages are rejected.
- Channel names longer than 100 characters are rejected.
- Archiving an already archived channel returns an error.
- Only the author can edit or delete their own message (unless they are a moderator).

These tests run in milliseconds and do not require a database. They give us confidence that the business logic works before we hook it up to the infrastructure.

---

## Error Taxonomy: Two Categories, No Panics

We maintain a strict error taxonomy in `ataqu-kernel`:

- `DomainError`: pure business rule violations (validation, not found, conflict, tenant violation, unauthorized, forbidden).
- `RepositoryError`: infrastructure failures, mapped from database constraint flags without coupling to `sqlx` (unique violation, foreign key violation, check violation, etc.).

Domain crates use their own specific error enums (`CinqDomainError`, `DialError`, `SparkError`, etc.) but they all map to the kernel's categories at the application layer. No `unwrap()` or `expect()` appears in domain code. Every failure path is typed and propagates cleanly.

---

## What Comes Next

With the domain logic done, the next step is to implement the repository traits in `ataqu-infra-repositories` using SeaORM entities. Then we build the application services in `ataqu-application` that orchestrate the idempotency flow, call the domain functions, persist events, and append to the outbox. After that, the API handlers and frontend SPAs.

But the foundation is solid. The domain crates are pure, testable, and independent of the database. They are the brains of the 10 apps. The infrastructure is the nervous system. We now have both.

---

**Follow the architecture:** `architecture.ataqu.so`  
**See the code:** The domain crates are open and documented. Drop us a line if you want raw schema diagrams or ADRs.

---

## Distribution Copy

**Hacker News Title:**  
*We built the pure domain logic for 10 SaaS apps in Rust: no I/O, no system clock, just functions*

**LinkedIn Hook:**  
*We wired the brains of 10 SaaS apps today. Pure domain logic, injected capabilities, and repository traits defined at the domain level. The code is testable, deterministic, and database-agnostic. This is how we build a unified SMB OS.*

**Twitter/X Thread (5 tweets):**  
1. We finished the domain layer for 10 SaaS apps today. No I/O, no system clock reads, just pure functions.  
2. Each domain crate defines repository traits but no implementation. SeaORM and raw SQL will come later in infrastructure.  
3. Validation, business rules, and errors are all inside the domain. No panics. Every failure path is typed.  
4. Tests use mock `IdGenerator` and `Clock`. They run fast and deterministically, without a database.  
5. Next up: repository implementations, application services, and API handlers. The architecture is coming together.

---

Publish it. It is not "we wrote some functions." It is **"we built the complete, testable, pure business logic for 10 apps in a few hours."** That is the story.
