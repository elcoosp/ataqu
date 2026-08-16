import type { ApiError, User } from "./index";

export const defaultUser = (overrides: Partial<User> = {}): User => ({
	id: overrides.id ?? "00000000-0000-0000-0000-000000000000",
	email: overrides.email ?? "user@example.com",
	tenantId: overrides.tenantId ?? "00000000-0000-0000-0000-000000000000",
	roles: overrides.roles ?? ["member"],
	name: overrides.name,
});

export const isApiError = (value: unknown): value is ApiError =>
	typeof value === "object" &&
	value !== null &&
	"code" in value &&
	"message" in value &&
	typeof (value as ApiError).code === "number" &&
	typeof (value as ApiError).message === "string";
