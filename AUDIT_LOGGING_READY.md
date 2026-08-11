# Audit Logging Integration Readiness

## Overview
A helper function `ataqu_application::audit::log_audit` is available to log audit events.
All service structs already hold an `audit_repo: Option<Arc<dyn AuditRepositoryTrait>>` field.

## What Needs to Be Done
To fully enable audit logging, you must:

1. **Add `user_id: Uuid` parameter** to each mutation method in the application services.
   - Example: `pub async fn create_contact(&self, user_id: Uuid, cmd: CreateContactCommand) -> CinqResult<Contact>`
   - Affected services: `cinq`, `vault`, `dial`, `tempo`, `sond`, `pivot`, `pause`

2. **Update all API handlers** to pass `auth.user_id` when calling these methods.

3. **Add audit log calls** inside each mutation method after the operation (or before, to capture old values).
   Example:
   ```rust
   use crate::audit::log_audit;

   // after successful operation
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

## List of Mutation Methods Needing Audit Logging
The following files contain lists of methods that were identified as mutations:
- `cinq_audit_methods.txt`
- `vault_audit_methods.txt`
- `dial_audit_methods.txt`
- `tempo_audit_methods.txt`
- `sond_audit_methods.txt`
- `pivot_audit_methods.txt`
- `pause_audit_methods.txt`

These files are located in the repository root after running the audit script.

## Estimated Effort
- Adding `user_id` parameter: ~1 day across all services.
- Updating API handlers: ~1 day.
- Adding audit calls: ~2 days.

## Next Steps
1. Assign a developer to implement the remaining audit logging integration.
2. Use the generated lists as a checklist.
3. Verify that all mutation endpoints are covered.

