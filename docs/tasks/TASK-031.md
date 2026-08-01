# TASK-031: Frontend SPA: AEGIS (Auth & Security)

## Execution Boundaries
 - `apps/aegis/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read the injected backend files (`aegis_service.rs`, `handlers/aegis.rs`, `ataqu-contracts/aegis.rs`) to determine the exact API endpoints, payloads, and response shapes.\n2. **Routing**: Use TanStack Router. Create routes for `/login`, `/mfa-setup`, `/admin/users`.\n3. **Auth State**: Use Zustand to store the JWT access token. Create an Axios/fetch wrapper to inject the `Authorization: Bearer` header.\n4. **Login Page**: Implement SSO buttons for Google and Microsoft (redirect to backend OIDC endpoints). Implement email/password fallback.\n5. **MFA Setup**: Implement a component that fetches the TOTP secret from the backend and renders a QR code using `qrcode.react`.\n6. **User Management**: Implement a data table using TanStack Table to list users, invite new users, and change roles.\n7. **Styling**: Use Tailwind CSS 4 and shadcn/ui components. Enforce dark-mode native design.\n8. **Idempotency**: Ensure all POST/PUT requests generate and send an `Idempotency-Key` header (UUIDv4).\n9. **Optimization**: Configure Vite for route-level code splitting. Ensure BlockNote or heavy libs are dynamically imported.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Login flow stores JWT correctly.\n- [ ] MFA QR code renders.\n- [ ] UI uses dark-mode native styling.
