import { describe, expect, it } from "vitest";
import { sanitizeMarkdownLinks, sanitizeUrl } from "../src/url";

describe("sanitizeUrl", () => {
	it("allows safe schemes and relative targets", () => {
		expect(sanitizeUrl("https://example.com/x")).toBe("https://example.com/x");
		expect(sanitizeUrl("http://localhost:3000/api")).toBe(
			"http://localhost:3000/api",
		);
		expect(sanitizeUrl("mailto:user@example.com")).toBe(
			"mailto:user@example.com",
		);
		expect(sanitizeUrl("tel:+33123456789")).toBe("tel:+33123456789");
		expect(sanitizeUrl("/relative/path")).toBe("/relative/path");
		expect(sanitizeUrl("relative/path")).toBe("relative/path");
		expect(sanitizeUrl("#anchor")).toBe("#anchor");
	});

	it("blocks script execution schemes", () => {
		for (const bad of [
			"javascript:alert(1)",
			"JaVaScRiPt:alert(1)",
			" javascript:alert(1)",
			"javascript\t:alert(1)",
			"jav\tascript:alert(1)",
			"jav\nascript:alert(1)",
			"data:text/html;base64,PHNjcmlwdD4=",
			"vbscript:msgbox",
			"file:///etc/passwd",
			"chrome://settings",
		]) {
			expect(sanitizeUrl(bad), bad).toBeNull();
		}
	});

	it("rejects protocol-relative and non-string inputs", () => {
		expect(sanitizeUrl("//evil.example/steal")).toBeNull();
		expect(sanitizeUrl(null)).toBeNull();
		expect(sanitizeUrl(undefined)).toBeNull();
		expect(sanitizeUrl(42)).toBeNull();
		expect(sanitizeUrl({ url: "https://x" })).toBeNull();
	});

	it("returns the original (trimmed) string for allowed values", () => {
		// Whitespace around a safe URL is cosmetic; the value is kept as-is so
		// the DOM keeps working — sniffing happens on the control-char-free copy.
		expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
	});
});

describe("sanitizeMarkdownLinks", () => {
	it("neutralizes javascript: urls in link nodes, keeping children", () => {
		const tree = [
			{
				type: "p",
				children: [
					{
						type: "a",
						url: "javascript:alert(document.cookie)",
						children: [{ text: "click" }],
					},
					{ text: " plain" },
				],
			},
		];
		const out = sanitizeMarkdownLinks(tree) as Array<any>;
		expect(out[0].children[0].url).toBe("");
		expect(out[0].children[0].children).toEqual([{ text: "click" }]);
		expect(out[0].children[1].text).toBe(" plain");
	});

	it("keeps safe urls untouched", () => {
		const tree = [{ type: "a", url: "https://example.com", children: [] }];
		expect(sanitizeMarkdownLinks(tree)).toEqual(tree);
	});

	it("handles href keys and deep nesting, without mutating the input", () => {
		const input = {
			type: "a",
			href: "vbscript:x",
			children: [{ type: "a", href: "data:text/html,x", children: [] }],
		};
		const out = sanitizeMarkdownLinks(input) as any;
		expect(out.href).toBe("");
		expect(out.children[0].href).toBe("");
		expect(input.href).toBe("vbscript:x");
	});

	it("passes scalars and arrays through", () => {
		expect(sanitizeMarkdownLinks("text")).toBe("text");
		expect(sanitizeMarkdownLinks(null)).toBeNull();
		expect(sanitizeMarkdownLinks([1, 2, 3])).toEqual([1, 2, 3]);
	});
});
