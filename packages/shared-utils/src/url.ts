/**
 * URL and link sanitization for rendered user content (security-critical).
 *
 * Markdown documents (`/pivot` editor) are deserialized from raw markdown and
 * can contain arbitrary link targets — `[click](javascript:alert(1))`. Any
 * `url`/`href` that reaches an `<a href>` or `<img src>` must pass through
 * `sanitizeUrl`, which enforces a strict scheme allowlist instead of trying
 * to blacklist attack strings.
 */

/** Schemes that are safe to navigate to from user-generated content. */
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * Return the value if it is safe to use as a link/image target, else `null`.
 * Scheme-less values (relative paths, `/rooted`, `#fragments`) are allowed;
 * protocol-relative `//host` targets are rejected so content cannot silently
 * navigate off-origin.
 */
export function sanitizeUrl(raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	const value = raw.trim();
	if (!value) return null;
	// Browsers ignore ASCII control characters (tab, newline, CR, NUL…) inside
	// and after the scheme, so strip them before sniffing — otherwise
	// `jav\tascript:alert(1)` would pass a naive `startsWith("javascript:")`
	// blacklist while still executing. Stripping control characters IS the
	// purpose of this regex, hence the suppression below.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: control-character stripping is the security control itself
	const compact = value.replace(/[\u0000-\u001f\u007f]+/g, "");
	const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(compact)?.[1];
	if (scheme === undefined) {
		// No scheme: origin-relative / in-page target. Block the
		// protocol-relative form (`//host/…`) explicitly.
		if (compact.startsWith("//")) return null;
		return value;
	}
	return ALLOWED_SCHEMES.has(scheme.toLowerCase()) ? value : null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null;
}

function sanitizeNode(node: UnknownRecord): UnknownRecord {
	const out: UnknownRecord = { ...node };
	for (const key of Object.keys(out)) {
		const value = out[key];
		if (key === "url" || key === "href") {
			if (typeof value === "string" && sanitizeUrl(value) === null) {
				// Neutralize instead of deleting so node structure stays valid
				// for the editor: the link renders with an empty target and its
				// children (the label text) are preserved.
				out[key] = "";
			}
			continue;
		}
		if (isRecord(value) || Array.isArray(value)) {
			out[key] = sanitizeMarkdownLinks(value);
		}
	}
	return out;
}

/**
 * Deep-sanitize every `url`/`href` in a deserialized document tree (PlateJS /
 * Slate nodes or any JSON shape). Returns a new tree; the input is untouched.
 */
export function sanitizeMarkdownLinks<T>(nodes: T): T {
	if (Array.isArray(nodes)) {
		return nodes.map((node) => sanitizeMarkdownLinks(node)) as unknown as T;
	}
	if (isRecord(nodes)) {
		return sanitizeNode(nodes) as unknown as T;
	}
	return nodes;
}
