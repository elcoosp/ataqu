/**
 * AEGIS handlers — auth, users, roles, permissions, API keys, audit,
 * tenant settings, approvals. Mirrors crates/ataqu-api handlers/aegis.rs.
 */
import { http, type HttpHandler, HttpResponse } from "msw";
import {
	ADMIN_ID,
	DEMO_PASSWORD,
	audit,
	bump,
	db,
	type MockUser,
} from "../db";
import {
	apiError,
	callerId,
	checkVersion,
	created,
	errorBody,
	jsonBody,
	listParams,
	mintTokens,
	noContent,
	notFound,
	ok,
	paginated,
	page,
	validationError,
	bare,
} from "../util";

const DEMO_TENANT_OVERVIEW = () => ({
	id: db.tenant.id,
	name: db.tenant.name,
	plan: db.tenant.plan,
	userCount: db.users.length,
	apiKeyCount: db.apiKeys.length,
});

export const toUserResponse = (u: MockUser) => ({
	id: u.id,
	email: u.email,
	name: u.name,
	tenant_id: db.tenant.id,
	version: u.version,
	role: u.role,
	is_active: u.is_active,
	mfa_enabled: u.mfa_enabled,
	last_login_at: u.last_login_at ?? null,
	created_at: u.created_at,
});

export const aegisHandlers: HttpHandler[] = [
	// ------------------------------------------------------------------ auth
	http.post("/api/aegis/login", async ({ request }) => {
		const { email, password } = await jsonBody<{ email: string; password: string }>(request);
		if (!email || !password) {
			return validationError("Email and password are required");
		}
		const user = db.users.find(
			(u) => u.email.toLowerCase() === email.toLowerCase(),
		);
		if (!user || password !== DEMO_PASSWORD) {
			return HttpResponse.json(
				errorBody("UNAUTHORIZED", "Invalid email or password"),
				{ status: 401 },
			);
		}
		if (!user.is_active) {
			return HttpResponse.json(
				errorBody("FORBIDDEN", "This account has been deactivated"),
				{ status: 403 },
			);
		}
		user.last_login_at = new Date().toISOString();
		audit(user.id, "login", "aegis", "session");
		return ok({ ...mintTokens(user.id), user_id: user.id });
	}),

	http.post("/api/aegis/refresh", async ({ request }) => {
		const { refresh_token } = await jsonBody<{ refresh_token?: string }>(request);
		if (!refresh_token || !refresh_token.startsWith("mockr.")) {
			return HttpResponse.json(
				errorBody("UNAUTHORIZED", "Invalid refresh token"),
				{ status: 401 },
			);
		}
		const userId = refresh_token.split(".")[1];
		const user = db.users.find((u) => u.id === userId);
		if (!user) {
			return HttpResponse.json(errorBody("UNAUTHORIZED", "Unknown user"), { status: 401 });
		}
		return ok({ ...mintTokens(user.id), user_id: user.id });
	}),

	http.post("/api/aegis/logout", () => noContent()),

	http.post("/api/aegis/signup", async ({ request }) => {
		const body = await jsonBody<{ email: string; password: string; name?: string }>(request);
		if (!body.email?.includes("@") || (body.password?.length ?? 0) < 8) {
			return validationError("Provide a valid email and a password of at least 8 characters");
		}
		if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
			return apiError("CONFLICT", "An account with this email already exists");
		}
		const user: MockUser = {
			id: `usr-${String(db.users.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`,
			email: body.email,
			name: body.name,
			password: body.password,
			version: 1,
			role: "admin",
			is_active: true,
			mfa_enabled: false,
			last_login_at: new Date().toISOString(),
			created_at: new Date().toISOString(),
		};
		db.users.push(user);
		db.tenant.userCount = db.users.length;
		audit(user.id, "signup", "aegis", "user", user.id);
		return HttpResponse.json(
			{ user_id: user.id, tenant_id: db.tenant.id, email: user.email },
			{ status: 201 },
		);
	}),

	http.post("/api/aegis/sso/login", async ({ request }) => {
		const { provider } = await jsonBody<{ provider: string }>(request);
		// In the mock the "SSO provider" round-trips straight back through the
		// SPA's /login?token=…&refreshToken=…&user_id=… callback contract.
		const user = db.users[0];
		const tokens = mintTokens(user.id);
		const params = new URLSearchParams({
			token: tokens.access_token,
			refreshToken: tokens.refresh_token,
			user_id: user.id,
			provider: provider ?? "google",
		});
		return ok({ url: `/login?${params.toString()}` });
	}),

	http.post("/api/aegis/mfa/setup", ({ request }) => {
		const userId = callerId(request);
		if (!userId) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({
			secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
			qr_code_url:
				"otpauth://totp/Ataqu:demo%40ataqu.com?issuer=Lumen%20Robotics&secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
		});
	}),

	http.post("/api/aegis/mfa/verify", async ({ request }) => {
		const { code } = await jsonBody<{ code: string }>(request);
		if (!/^\d{6}$/.test(code ?? "")) {
			return validationError("Enter the 6-digit code from your authenticator app");
		}
		return noContent();
	}),

	// ----------------------------------------------------------------- users
	http.get("/api/aegis/me", ({ request }) => {
		const userId = callerId(request);
		if (!userId) return apiError("UNAUTHORIZED", "Authentication required");
		const user = db.users.find((u) => u.id === userId);
		if (!user) return apiError("UNAUTHORIZED", "Session expired");
		return ok(toUserResponse(user));
	}),

	http.get("/api/aegis/users", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(db.users.map(toUserResponse));
	}),

	http.post("/api/aegis/users", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ email: string; password: string; name?: string }>(request);
		if (!body.email?.includes("@")) return validationError("A valid email is required");
		if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
			return apiError("CONFLICT", "A user with this email already exists");
		}
		const user: MockUser = {
			id: `usr-${String(db.users.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`,
			email: body.email,
			name: body.name,
			password: body.password ?? "demo1234",
			version: 1,
			role: "viewer",
			is_active: true,
			mfa_enabled: false,
			last_login_at: null,
			created_at: new Date().toISOString(),
		};
		db.users.push(user);
		db.tenant.userCount = db.users.length;
		audit(actor, "user.create", "aegis", "user", user.id, { email: user.email });
		return created(toUserResponse(user));
	}),

	http.patch("/api/aegis/users/:userId/role", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const user = db.users.find((u) => u.id === params.userId);
		if (!user) return notFound("User");
		const conflictResp = checkVersion(request, user.version);
		if (conflictResp) return conflictResp;
		const { role } = await jsonBody<{ role: string }>(request);
		user.role = role;
		bump(user);
		audit(actor, "user.role_update", "aegis", "user", user.id, { role });
		return noContent();
	}),

	http.post("/api/aegis/users/:userId/deactivate", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const user = db.users.find((u) => u.id === params.userId);
		if (!user) return notFound("User");
		user.is_active = false;
		bump(user);
		audit(actor, "user.deactivate", "aegis", "user", user.id);
		return noContent();
	}),

	http.post("/api/aegis/users/invite", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ email: string; role: string; name?: string }>(request);
		if (!body.email?.includes("@")) return validationError("A valid email is required");
		const user: MockUser = {
			id: `usr-${String(db.users.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`,
			email: body.email,
			name: body.name ?? body.email.split("@")[0],
			password: "demo1234",
			version: 1,
			role: body.role ?? "viewer",
			is_active: true,
			mfa_enabled: false,
			last_login_at: null,
			created_at: new Date().toISOString(),
		};
		db.users.push(user);
		db.tenant.userCount = db.users.length;
		audit(actor, "user.invite", "aegis", "user", user.id, { email: user.email, role: user.role });
		return created({ user_id: user.id, email: user.email });
	}),

	// ---------------------------------------------------------- permissions
	http.get("/api/aegis/permission-matrix", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(db.permissions);
	}),

	http.patch("/api/aegis/permissions/:userId/:app", async ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const row = db.permissions.find((p) => p.user_id === params.userId);
		if (!row) return notFound("Permission row");
		const { role } = await jsonBody<{ role: "admin" | "editor" | "viewer" | "none" }>(request);
		if (!["admin", "editor", "viewer", "none"].includes(role)) {
			return validationError("Role must be one of admin, editor, viewer, none");
		}
		row.roles[params.app as string] = role;
		audit(actor, "permission.update", "aegis", "permission", `${params.userId}:${params.app}`, { role });
		return noContent();
	}),

	// ------------------------------------------------------------ api keys
	http.get("/api/aegis/api-keys", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(db.apiKeys);
	}),

	http.post("/api/aegis/api-keys", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; scopes?: string[] }>(request);
		if (!body.name?.trim()) return validationError("Key name is required");
		const key = {
			id: nextKeyId(),
			name: body.name.trim(),
			prefix: `ak_${body.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}${Math.floor(Math.random() * 90 + 10)}`,
			scopes: body.scopes?.length ? body.scopes : ["read"],
			created_at: new Date().toISOString(),
			last_used_at: null,
		};
		db.apiKeys.push(key);
		db.tenant.apiKeyCount = db.apiKeys.length;
		audit(actor, "apikey.create", "aegis", "api_key", key.id, { name: key.name });
		// The one-time full secret is only ever returned here.
		return created({ ...key, key: `${key.prefix}_${crypto.randomUUID().replaceAll("-", "")}` });
	}),

	http.delete("/api/aegis/api-keys/:id", ({ request, params }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const idx = db.apiKeys.findIndex((k) => k.id === params.id);
		if (idx === -1) return notFound("API key");
		db.apiKeys.splice(idx, 1);
		db.tenant.apiKeyCount = db.apiKeys.length;
		audit(actor, "apikey.delete", "aegis", "api_key", params.id as string);
		return noContent();
	}),

	// --------------------------------------------------------------- audit
	http.get("/api/aegis/audit-log", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		const action = new URL(request.url).searchParams.get("action");
		const app = new URL(request.url).searchParams.get("app");
		let rows = db.audit;
		if (action) rows = rows.filter((a) => a.action.includes(action));
		if (app) rows = rows.filter((a) => a.app === app);
		// getAuditLog declares a bare array (AuditLogEntry[]) — no envelope.
		return bare(rows);
	}),

	// --------------------------------------------------------------- roles
	http.get("/api/aegis/roles", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(db.roles);
	}),

	http.post("/api/aegis/roles", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name: string; permissions: string[] }>(request);
		if (!body.name?.trim()) return validationError("Role name is required");
		const role = {
			id: `rol-${String(db.roles.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`,
			name: body.name.trim(),
			permissions: body.permissions ?? [],
			created_at: new Date().toISOString(),
		};
		db.roles.push(role);
		audit(actor, "role.create", "aegis", "role", role.id, { name: role.name });
		return created(role);
	}),

	// ------------------------------------------------------------ tenant
	http.get("/api/aegis/tenant", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(DEMO_TENANT_OVERVIEW());
	}),

	http.get("/api/aegis/tenant/settings", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({
			id: "set-001",
			tenant_id: db.tenant.id,
			name: db.tenant.name,
			plan: db.tenant.plan,
			settings: db.tenant.settings,
			updated_at: new Date().toISOString(),
			version: db.tenant.version,
		});
	}),

	http.patch("/api/aegis/tenant/settings", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ name?: string; settings?: Record<string, unknown> }>(request);
		if (body.name) db.tenant.name = body.name;
		if (body.settings) db.tenant.settings = { ...db.tenant.settings, ...body.settings };
		bump(db.tenant);
		audit(actor, "tenant.settings_update", "aegis", "tenant", db.tenant.id, body);
		return ok({
			id: "set-001",
			tenant_id: db.tenant.id,
			name: db.tenant.name,
			plan: db.tenant.plan,
			settings: db.tenant.settings,
			updated_at: new Date().toISOString(),
			version: db.tenant.version,
		});
	}),

	http.get("/api/aegis/tenant/ip-allowlist", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok({ ip_allowlist: db.ipAllowlist });
	}),

	http.put("/api/aegis/tenant/ip-allowlist", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const body = await jsonBody<{ ip_allowlist: string[] }>(request);
		if (!Array.isArray(body.ip_allowlist)) {
			return validationError("ip_allowlist must be an array of CIDRs or IPs");
		}
		db.ipAllowlist = body.ip_allowlist;
		audit(actor, "tenant.ip_allowlist_update", "aegis", "tenant", db.tenant.id);
		return ok({ ip_allowlist: db.ipAllowlist });
	}),

	// ---------------------------------------------------------- approvals
	http.get("/api/aegis/approvals", ({ request }) => {
		if (!callerId(request)) return apiError("UNAUTHORIZED", "Authentication required");
		return ok(db.pendingApprovals.filter((a) => a.status === "pending"));
	}),

	http.post("/api/aegis/approvals/approve", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { run_id } = await jsonBody<{ run_id: string }>(request);
		const approval = db.pendingApprovals.find((a) => a.run_id === run_id);
		if (!approval) return notFound("Pending approval");
		approval.status = "approved";
		const run = db.runs.find((r) => r.id === run_id);
		if (run) {
			run.status = "approved";
			run.updated_at = new Date().toISOString();
		}
		audit(actor, "workflow.approve", "spark", "run", run_id);
		return ok({ approved: true });
	}),

	http.post("/api/aegis/approvals/reject", async ({ request }) => {
		const actor = callerId(request);
		if (!actor) return apiError("UNAUTHORIZED", "Authentication required");
		const { run_id } = await jsonBody<{ run_id: string }>(request);
		const approval = db.pendingApprovals.find((a) => a.run_id === run_id);
		if (!approval) return notFound("Pending approval");
		approval.status = "rejected";
		const run = db.runs.find((r) => r.id === run_id);
		if (run) {
			run.status = "rejected";
			run.updated_at = new Date().toISOString();
		}
		audit(actor, "workflow.reject", "spark", "run", run_id);
		return noContent();
	}),
];

// Local helper (avoids importing the counter-based nextId for per-call unique
// keys created outside the seed).
function nextKeyId() {
	return `key-${String(db.apiKeys.length + 1).padStart(3, "0")}-${crypto.randomUUID().slice(0, 4)}`;
}

// Re-exported for handlers that need bare-array pagination (unused import shim)
export { paginated, bare };
