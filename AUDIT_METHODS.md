# Methods Requiring Audit Logging

The following service mutation methods have been identified as needing audit logging.
A `// TODO: Add audit log call...` comment has been inserted inside each method body.

## Service Files Modified
- `cinq_service.rs`
- `vault_service.rs`
- `dial_service.rs`
- `tempo_service.rs`
- `sond_service.rs`
- `pivot_service.rs`
- `pause_service.rs`

## Steps to Complete Audit Logging
1. For each method with a TODO comment, replace the comment with a call to `log_audit`.
2. Ensure the method signature includes `user_id: Uuid` as a parameter (add if missing).
3. Update the corresponding API handler to pass `auth.user_id` to the service method.

## Example Audit Call
```rust
log_audit(
    &self.audit_repo,
    tenant_id,
    user_id,
    "create_contact",
    "cinq",
    Some("contact"),
    Some(contact.id),
    None,
    Some(serde_json::json!({ "name": contact.name })),
    None,
    None,
).await;
```

## API Handler Changes
In each handler, when calling the service method, pass `auth.user_id` as the first argument after `&self`.

