import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeSsoFragment, isValidSsoToken, parseSsoFragment } from "./sso";

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.kQHTVxKc8sHcLfE";
const REFRESH = "rfr_9f0c8e6a1b2c4d3e8f4a0b1c2d3e4f5a";
const USER_ID = "0b8f6d1e-2c3a-4b5d-9e6f-7a8b9c0d1e2f";
const FRAGMENT = `token=${encodeURIComponent(TOKEN)}&refreshToken=${encodeURIComponent(
	REFRESH,
)}&user_id=${USER_ID}`;

describe("isValidSsoToken", () => {
	it("accepts JWT-shaped and opaque tokens within the charset", () => {
		expect(isValidSsoToken(TOKEN)).toBe(true);
		expect(isValidSsoToken(REFRESH)).toBe(true);
		expect(isValidSsoToken("a".repeat(16))).toBe(true);
	});

	it("rejects values that are too short or too long", () => {
		expect(isValidSsoToken("short")).toBe(false);
		expect(isValidSsoToken("x".repeat(2049))).toBe(false);
	});

	it("rejects control characters, whitespace and shell metacharacters", () => {
		expect(isValidSsoToken("abc def ghi jkl mno")).toBe(false);
		expect(isValidSsoToken("token\nAuthorization: evil")).toBe(false);
		expect(isValidSsoToken(`${"a".repeat(10)}\u0000`)).toBe(false);
	});
});

describe("parseSsoFragment", () => {
	it("parses a valid fragment with or without the leading '#'", () => {
		const expected = { token: TOKEN, refreshToken: REFRESH, userId: USER_ID };
		expect(parseSsoFragment(FRAGMENT)).toEqual(expected);
		expect(parseSsoFragment(`#${FRAGMENT}`)).toEqual(expected);
	});

	it("decodes percent-encoded token values", () => {
		const tricky = "abc+def/ghi=jkl_mno-pqr.stu==";
		expect(
			parseSsoFragment(
				`token=${encodeURIComponent(tricky)}&refreshToken=${encodeURIComponent(
					REFRESH,
				)}&user_id=${USER_ID}`,
			)?.token,
		).toBe(tricky);
	});

	it("returns null when fields are missing", () => {
		expect(parseSsoFragment("")).toBeNull();
		expect(parseSsoFragment(`token=${TOKEN}`)).toBeNull();
		expect(
			parseSsoFragment(`token=${TOKEN}&refreshToken=${REFRESH}`),
		).toBeNull();
	});

	it("returns null when a token fails validation", () => {
		expect(
			parseSsoFragment(
				`token=short&refreshToken=${REFRESH}&user_id=${USER_ID}`,
			),
		).toBeNull();
		expect(
			parseSsoFragment(
				`token=${encodeURIComponent("bad token with spaces yes")}&refreshToken=${REFRESH}&user_id=${USER_ID}`,
			),
		).toBeNull();
	});

	it("returns null when user_id is not a UUID", () => {
		expect(
			parseSsoFragment(
				`token=${TOKEN}&refreshToken=${REFRESH}&user_id=../../admin`,
			),
		).toBeNull();
		expect(
			parseSsoFragment(`token=${TOKEN}&refreshToken=${REFRESH}&user_id=1`),
		).toBeNull();
	});
});

describe("consumeSsoFragment", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/login");
	});

	afterEach(() => {
		window.history.replaceState(null, "", "/");
		vi.restoreAllMocks();
	});

	it("returns the payload and strips the fragment from the URL", () => {
		window.history.replaceState(null, "", `/login?next=x#${FRAGMENT}`);
		const payload = consumeSsoFragment();
		expect(payload).toEqual({
			token: TOKEN,
			refreshToken: REFRESH,
			userId: USER_ID,
		});
		expect(window.location.hash).toBe("");
		// Query string is preserved; only the fragment is removed.
		expect(window.location.search).toBe("?next=x");
	});

	it("strips an INVALID fragment too and returns null", () => {
		window.history.replaceState(null, "", "/login#token=garbage_value");
		expect(consumeSsoFragment()).toBeNull();
		expect(window.location.hash).toBe("");
	});

	it("returns null on a clean URL without touching history", () => {
		const spy = vi.spyOn(window.history, "replaceState");
		expect(consumeSsoFragment()).toBeNull();
		expect(spy).not.toHaveBeenCalled();
	});
});
