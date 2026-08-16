export type UUID = string;
export type TenantId = UUID;
export interface User {
	id: UUID;
	email: string;
	tenantId: TenantId;
	roles: string[];
	name?: string;
}
export interface ApiError {
	code: number;
	message: string;
	details?: unknown;
}
export interface PaginationParams {
	page?: number;
	limit?: number;
	offset?: number;
}
export interface SortOrder {
	field: string;
	direction: "asc" | "desc";
}
export type Entity = {
	id: UUID;
	createdAt: string;
	updatedAt: string;
};

export * from "./fallbacks";
