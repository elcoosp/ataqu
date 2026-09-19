/**
 * Normalizes message list payloads across envelope generations. The React
 * Query cache stores untyped data, so the input is narrowed at runtime.
 */
export interface NormalizedMessageList<T> {
	items: T[];
	total: number;
	limit?: number;
	offset?: number;
}

export function normalizeMessageList<T>(
	payload: unknown,
): NormalizedMessageList<T> {
	if (Array.isArray(payload)) {
		return { items: payload as T[], total: payload.length };
	}
	const record = (
		typeof payload === "object" && payload !== null ? payload : {}
	) as {
		items?: unknown;
		messages?: unknown;
		total?: number;
		limit?: number;
		offset?: number;
	};
	const items = (
		Array.isArray(record.items)
			? record.items
			: Array.isArray(record.messages)
				? record.messages
				: []
	) as T[];
	return {
		items,
		total: record.total ?? items.length,
		limit: record.limit,
		offset: record.offset,
	};
}
