# TASK-031: Frontend SPA — AEGIS (SSO & Security)

## Objective
Implement AEGIS: SSO login (Google/Microsoft), MFA enrollment (TOTP), user management (invite/roles), API key generation, RBAC roles, IP allowlist, and AEGIS-specific command palette actions.

## Execution Boundaries
- `apps/aegis/src/routes/login.tsx`
- `apps/aegis/src/routes/_auth.tsx`
- `apps/aegis/src/routes/_auth/dashboard.tsx`
- `apps/aegis/src/routes/_auth/users/index.tsx`
- `apps/aegis/src/routes/_auth/users.$id.tsx`
- `apps/aegis/src/routes/_auth/roles.tsx`
- `apps/aegis/src/routes/_auth/api-keys.tsx`
- `apps/aegis/src/routes/_auth/settings.tsx`
- `apps/aegis/src/api/`
- `apps/aegis/src/stores/`
- `apps/aegis/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-aegis`, `crates/ataqu-application/src/aegis_service.rs`, and `crates/ataqu-api/src/handlers/aegis.rs`. You MUST read these Rust files to derive:*
- **Entity Types**: Map `User`, `Role`, `ApiKey`, `Tenant` Rust structs to TypeScript interfaces in `apps/aegis/src/api/types.ts`.
- **API Endpoints**: Read the Axum router in `aegis.rs`: `POST /auth/sso/google`, `POST /auth/sso/microsoft`, `POST /auth/mfa/setup`, `POST /auth/mfa/verify`, `GET /users`, `POST /users/invite`, `PATCH /users/:id/role`, `GET /roles`, `POST /roles`, `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/:id`, `GET /tenant`, `PATCH /tenant/settings`.
- **PII Handling**: Backend uses `Email` newtypes with no `Serialize`. API wrapper `ApiEmail` serializes to string. TypeScript `User.email` is plain `string`.
- **Error Types**: Map `AegisError` enum variants to TypeScript union types.
- **JWT**: Backend issues short-lived access tokens + refresh tokens. Store both in auth store.

## UI Contract

### Shell & Layout
- Import `{ Shell }` from `@ataqu/ui`. Wrap root route with `<Shell activeApp="aegis">`.
- All internal routes use `<DashboardLayout>` from `@ataqu/ui` (high-density grid).

### Auth Store (`apps/aegis/src/stores/auth-store.ts`)
- Zustand with `persist` middleware.
- State: `token: string | null`, `refreshToken: string | null`, `user: User | null`, `tenantId: string | null`.
- Actions: `login(token, refreshToken, user)`, `logout()`, `refreshToken()`.
- Persisted in localStorage under key `ataqu-auth`.

### Login Page (`login.tsx`)
- NO email/password form for MLP. SSO only.
- Two buttons: "Continue with Google" and "Continue with Microsoft".
- These are `<a>` tags redirecting to `/api/v1/aegis/auth/sso/google` and `/api/v1/aegis/auth/sso/microsoft`.
- On callback (redirect back with `?token=...&refreshToken=...`), parse URL params, call `authStore.login()`, redirect to `/dashboard`.
- Use `<AuthLayout>` from `@ataqu/ui` (centered, no sidebar).
- Dark-mode native. Deep Night Blue background.

### Auth Guard (`_auth.tsx`)
- Check `authStore.token`. If null, redirect to `/login`.
- If token exists but expired (decode JWT exp claim), attempt silent refresh. If refresh fails, redirect to `/login`.

### Dashboard (`dashboard.tsx`)
- Show: Tenant name, plan tier (Starter/Pro/Suite), user count, API key count.
- Quick links to Users, Roles, API Keys.
- Fetch data via `useQuery({ queryKey: ['aegis', 'tenant'] })`.

### Users Page (`users/index.tsx`)
- `@ataqu/ui` `Table` component. Columns: Name, Email, Role, Status, Last Active.
- "Invite User" button opens modal: email input + role select (Admin/Member/Viewer/Custom).
- `POST /users/invite` with `Idempotency-Key` header.
- Row click navigates to `/users/:id` (user detail with MFA status, role assignment, access revocation).
- "Revoke Access" button on user detail: immediate `DELETE /users/:id/access` with confirmation modal.
- Empty state: `<EmptyState icon={UserPlus} title="No users yet" description="Invite your team. One login, 10 apps." ctaLabel="Invite User" />`.

### Roles Page (`roles.tsx`)
- List existing roles (Admin, Member, Viewer, Custom).
- "Create Role" button opens modal: name + permission checkboxes.
- `POST /roles` with `Idempotency-Key`.

### API Keys Page (`api-keys.tsx`)
- Table: Name, Created At, Last Used, Actions (Revoke).
- "Create Key" button opens modal: name input. On submit, `POST /api-keys` with `Idempotency-Key`.
- Key displayed ONCE in a modal with copy button and warning: "You won't see this again."
- "Revoke" button: `DELETE /api-keys/:id` with confirmation.
- Empty state: `<EmptyState icon={Key} title="No API keys" description="Generate a key for programmatic access to Ataqu APIs." ctaLabel="Create Key" />`.

### Settings Page (`settings.tsx`)
- Tenant name (editable), plan display, billing link.
- MFA enrollment section: "Setup MFA" button calls `POST /auth/mfa/setup`, receives TOTP secret. Render QR code using `qrcode.react`. User enters 6-digit code to verify via `POST /auth/mfa/verify`.
- IP allowlist configuration (P1 feature).

### Command Palette Actions (`apps/aegis/src/actions.ts`)
Register these actions with the global command palette:
- `Invite User` → opens user invitation modal
- `Go to Users` → navigate to `/users`
- `Go to Roles` → navigate to `/roles`
- `Go to API Keys` → navigate to `/api-keys`
- `Create API Key` → opens API key creation modal
- `Revoke [User] Access` → only when a user is selected in the table

### Empty States (from `mmp-gaps.md` and `onboarding-activation-plan.md`)
Every empty state MUST use `<EmptyState>` from `@ataqu/ui` with:
- Lucide icon
- Bold title (no exclamation marks)
- One-line description
- Single CTA button
- No decorative emoji

### Toasts (from `mmp-gaps.md`)
Use `useToast` from `@ataqu/shared-hooks`. Contextual messages:
- "User invited." (not "🎉 User invited successfully!")
- "API key created."
- "Key revoked."
- "MFA enabled."
- "Role updated."
- "Access revoked."

### Optimistic UI (from `brand-book.md` 150ms rule)
- Role changes: update table instantly, revert on error.
- API key revocation: remove from list instantly, revert on error.
- User invitation: add to table instantly with "pending" status.

### Styling
- Dark-mode native. Tailwind tokens only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`.
- Amber (`bg-primary`) ONLY for primary CTA buttons and active states.
- 8px grid spacing.
- Focus rings: 2px amber (`ring-ring`).
- NO loading spinners. Use skeleton loaders.

## Implementation Plan (Development Script)
1. Create `apps/aegis/src/api/types.ts` with `User`, `Role`, `ApiKey`, `Tenant`, `LoginResponse`, `MfaSetupResponse` interfaces mapped from Rust structs.
2. Create `apps/aegis/src/api/aegis-api.ts` with typed fetch functions. All mutating functions accept `idempotencyKey` parameter and set `Idempotency-Key` header.
3. Create `apps/aegis/src/stores/auth-store.ts` (Zustand persisted).
4. Patch `apps/aegis/src/routes/login.tsx` with SSO buttons + callback handler.
5. Patch `apps/aegis/src/routes/_auth.tsx` with auth guard + silent refresh.
6. Create `apps/aegis/src/routes/_auth/dashboard.tsx` with tenant info.
7. Create `apps/aegis/src/routes/_auth/users/index.tsx` with table + invite modal.
8. Create `apps/aegis/src/routes/_auth/users.$id.tsx` with user detail + revoke.
9. Create `apps/aegis/src/routes/_auth/roles.tsx` with role management.
10. Create `apps/aegis/src/routes/_auth/api-keys.tsx` with key list + create modal.
11. Create `apps/aegis/src/routes/_auth/settings.tsx` with MFA enrollment (QR code) + IP allowlist.
12. Create `apps/aegis/src/actions.ts` exporting command palette actions.
13. Run scoped frontend gates for `aegis` (`pnpm biome check --apply .`, `pnpm tsc --noEmit`).
14. Commit with `feat(aegis): implement SSO, MFA, users, roles, API keys, command palette (baseline)`.

## Definition of Done (DoD)
- [ ] All TypeScript types match injected Rust struct field names (snake_case → camelCase).
- [ ] SSO login redirects to backend OAuth URL and handles callback.
- [ ] Auth store persists token + refreshToken in localStorage and restores on reload.
- [ ] Silent token refresh works when access token expires.
- [ ] MFA QR code renders and verification works.
- [ ] Users table renders loading skeleton, error state, empty state, and data.
- [ ] API key creation shows the key exactly once with a copy button.
- [ ] Role assignment uses optimistic UI.
- [ ] Command palette actions registered and functional.
- [ ] All empty states use `<EmptyState>` from `@ataqu/ui`.
- [ ] All toasts are contextual (not generic "Saved").
- [ ] No `any` types. No hardcoded API URLs (use `VITE_API_BASE_URL`).
- [ ] All mutations include `Idempotency-Key` header.
- [ ] No loading spinners. Skeleton loaders only.
- [ ] `pnpm tsc --noEmit` and `pnpm biome check` pass with zero errors.
