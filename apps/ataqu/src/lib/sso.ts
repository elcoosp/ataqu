/**
 * SSO callback handling (security-critical).
 *
 * The backend (`crates/ataqu-api/src/handlers/aegis.rs`) returns SSO tokens in
 * the URL *fragment* (`#token=…&refreshToken=…&user_id=…`), never in the query
 * string — fragments are not sent to servers, so they cannot leak via
 * Referer headers, proxy logs or browser history sync.
 *
 * This module parses that fragment defensively and sanitizes it:
 *   - tokens must match a strict charset/length (JWT base64url alphabet);
 *   - `user_id` must be a UUID;
 *   - the fragment is stripped from history IMMEDIATELY (replaceState), so the
 *     tokens never land in session history, screen recordings or
 *     copy-pasteable URLs — and are never logged.
 */

export interface SsoFragmentPayload {
	token: string;
	refreshToken: string;
	userId: string;
}

/** JWTs are base64url segments joined by dots (opaque tokens may add `+/=`). */
const TOKEN_PATTERN = /^[A-Za-z0-9._+/=-]{16,2048}$/;
const UUID_PATTERN =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Validate a single token value — charset, length, no control characters. */
export function isValidSsoToken(value: string): boolean {
	if (value.length < 16 || value.length > 2048) return false;
	for (const ch of value) {
		const code = ch.codePointAt(0) ?? 0;
		if (code <= 0x1f || code === 0x7f) return false; // control chars
	}
	return TOKEN_PATTERN.test(value);
}

/**
 * Parse an SSO fragment (with or without the leading `#`).
 * Returns `null` when anything is missing or fails validation — callers must
 * treat that as "no session" and NEVER partially trust the payload.
 */
export function parseSsoFragment(hash: string): SsoFragmentPayload | null {
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	if (!raw) return null;
	// URLSearchParams decodes percent-encoding done by the backend
	// (`urlencoding::encode`), including any `+`-safe token characters.
	let params: URLSearchParams;
	try {
		params = new URLSearchParams(raw);
	} catch {
		return null;
	}
	const token = params.get("token") ?? "";
	const refreshToken = params.get("refreshToken") ?? "";
	const userId = params.get("user_id") ?? "";
	if (!token || !refreshToken || !userId) return null;
	if (!isValidSsoToken(token) || !isValidSsoToken(refreshToken)) return null;
	if (!UUID_PATTERN.test(userId)) return null;
	return { token, refreshToken, userId };
}

/**
 * Atomically consume the SSO fragment: read it and immediately remove it from
 * the address bar / history entry via `history.replaceState`. Returns the
 * (validated) payload or `null`. The strip happens even on invalid payloads so
 * a tampered or partial fragment never lingers in the UI or history.
 */
export function consumeSsoFragment(): SsoFragmentPayload | null {
	if (typeof window === "undefined") return null;
	const hash = window.location.hash;
	const payload = parseSsoFragment(hash);
	if (hash) stripFragment();
	return payload;
}

/** Remove the URL fragment without adding a history entry. */
export function stripFragment(): void {
	if (typeof window === "undefined") return;
	const { pathname, search } = window.location;
	window.history.replaceState(null, "", `${pathname}${search}`);
}
