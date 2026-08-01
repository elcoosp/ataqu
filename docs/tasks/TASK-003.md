# TASK-003: ataqu-security: PII Newtypes & Crypto

## Execution Boundaries
 - `crates/ataqu-security/src/*`

## Step-by-Step Implementation Details
 1. Define `Email(String)` and `Phone(String)` newtypes.
2. Implement `fmt::Debug` and `fmt::Display` to output `[REDACTED]`.
3. **DO NOT** implement `serde::Serialize` for these newtypes (ADR-007).
4. Define `PiiAccessKey` struct gated by `infra-pii-access` feature.
5. Add `reveal(&self, key: &PiiAccessKey) -> &str` method.
6. Implement AES-256-GCM encryption/decryption, Argon2 hashing, RS256 JWT sign/verify.

## Success Criteria & Verification
 - [ ] `serde_json::to_string(&email)` fails to compile.
- [ ] `format!("{:?}", email)` outputs "[REDACTED]".
- [ ] JWT and AES unit tests pass.
