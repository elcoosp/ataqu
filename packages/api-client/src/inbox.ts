import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

// ----------------------------------------------------------------------------
// CROSS-APP ACTIVITY INBOX (brainstorm §5.5 F1)
// ----------------------------------------------------------------------------

export type InboxSeverity = "info" | "warning" | "critical";

/** Which app produced the signal. Kept as a string so a new producer app does
 * not require a client release to be rendered. */
export type InboxApp =
	| "vault"
	| "spark"
	| "pause"
	| "dial"
	| "sond"
	| "tempo"
	| "cinq"
	| "changelog"
	| (string & {});

export interface InboxItem {
	id: string;
	kind: string;
	app: InboxApp;
	title: string;
	subtitle?: string | null;
	severity: InboxSeverity;
	created_at: string;
	/** Router-relative link to the owning record, used by the Enter key. */
	deep_link: string;
}

/**
 * Fetch the unified cross-app inbox.
 *
 * The server fans out across every producing app and returns one ranked feed
 * (most urgent first, newest first within a severity), so the client makes a
 * single request instead of one per app.
 */
export const getInbox = (limit = 50): Promise<InboxItem[]> =>
	api.get<InboxItem[]>("/v1/inbox", { params: { limit } });

/**
 * Poll the inbox. Polling (rather than SSE) is deliberate: the brainstorm's
 * anti-goals forbid shipping a realtime transport before the product needs it,
 * and 30s is honest about what actually happens.
 */
export const useInbox = (limit = 50, refetchIntervalMs = 30_000) =>
	useQuery({
		queryKey: ["inbox", limit],
		queryFn: () => getInbox(limit),
		refetchInterval: refetchIntervalMs,
		staleTime: refetchIntervalMs / 2,
	});
