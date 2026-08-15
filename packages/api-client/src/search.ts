import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { UUID } from "./types";

/**
 * Raw payload returned by the backend `GET /search` unified-search handler.
 * The backend does NOT include a deep-link URL — the client derives it per
 * (app, entity_type) so the Command Palette can navigate correctly.
 */
export interface RawSearchResult {
	app: string;
	entity_type: string;
	id: UUID;
	title: string;
	subtitle?: string | null;
}

/** Client-side enriched search result with a computed deep-link + display metadata. */
export interface UnifiedSearchResult {
	app: string;
	entity_type: string;
	id: UUID;
	title: string;
	subtitle?: string | null;
	/** In-app route (relative to the target app's origin), e.g. `/contacts/:id`. */
	url: string;
	/** Human-readable app name, e.g. "CINQ". */
	appName: string;
}

const APP_NAMES: Record<string, string> = {
	aegis: "AEGIS",
	cinq: "CINQ",
	dial: "DIAL",
	pivot: "PIVOT",
	spark: "SPARK",
	tempo: "TEMPO",
	sond: "SOND",
	vault: "VAULT",
	pause: "PAUSE",
	vista: "VISTA",
};

/** Map a (app, entity_type, id) triple to the in-app deep-link route. */
function urlFor(app: string, entityType: string, id: UUID): string {
	switch (`${app}/${entityType}`) {
		case "cinq/contact":
			return `/contacts/${id}`;
		case "cinq/deal":
			return `/deals/${id}`;
		case "dial/message":
			return `/channels`;
		case "pivot/document":
			return `/doc/${id}`;
		case "pivot/database":
			return `/db/${id}`;
		case "pause/employee":
			return `/employees/${id}`;
		case "aegis/user":
			return `/users/${id}`;
		case "vault/product":
			return `/products/${id}`;
		case "vault/variant":
			return `/products/${id}`;
		case "spark/workflow":
			return `/workflows/${id}`;
		case "vista/dashboard":
			return `/dashboards/${id}`;
		case "tempo/event_type":
			return `/event-types/${id}`;
		case "sond/form":
			return `/forms/${id}`;
		default:
			return `/`;
	}
}

function enrich(raw: RawSearchResult): UnifiedSearchResult {
	return {
		...raw,
		url: urlFor(raw.app, raw.entity_type, raw.id),
		appName: APP_NAMES[raw.app] ?? raw.app.toUpperCase(),
	};
}

export interface UnifiedSearchParams {
	q: string;
	limit?: number;
}

/** Query the unified cross-app search endpoint. */
export const search = (
	params: UnifiedSearchParams,
): Promise<RawSearchResult[]> =>
	api.get<RawSearchResult[]>("/search", { params });

/** Query the unified search endpoint and return client-enriched results (with deep links). */
export const searchEnriched = async (
	params: UnifiedSearchParams,
): Promise<UnifiedSearchResult[]> => {
	const raw = await search(params);
	return raw.map(enrich);
};

/** TanStack Query hook for unified search. */
export const useSearch = (q: string, limit = 20) => {
	const debounced = q.trim();
	return useQuery({
		queryKey: ["unified-search", debounced, limit],
		queryFn: () => searchEnriched({ q: debounced, limit }),
		enabled: debounced.length > 0,
		staleTime: 30_000,
	});
};
