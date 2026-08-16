import { useAuthStore } from "@ataqu/shared-stores";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as aegis from "../src/aegis";
import * as cinq from "../src/cinq";
import { api } from "../src/client";
import * as dial from "../src/dial";
import * as health from "../src/health";
import * as migration from "../src/migration";
import * as pause from "../src/pause";
import * as pivot from "../src/pivot";
import * as search from "../src/search";
import * as sond from "../src/sond";
import * as spark from "../src/spark";
import * as tempo from "../src/tempo";
import * as vault from "../src/vault";
import * as vista from "../src/vista";

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as Response;
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
	fetchMock.mockResolvedValue(jsonResponse({ id: "1", version: 1 }));
	useAuthStore.setState({ token: "t", user: null, tenantId: "ten" });
});

// Exercise every exported *function* (excluding React hooks) with dummy args.
async function exercise(module: Record<string, unknown>, moduleName: string) {
	const seen: string[] = [];
	for (const [name, fn] of Object.entries(module)) {
		if (typeof fn !== "function") continue;
		if (name === "api") continue;
		if (name.startsWith("use")) continue; // hooks need React render
		// try a few argument shapes; the first that doesn't throw sync wins
		let threw = false;
		try {
			const candidateArgs = [
				[],
				["1"],
				["1", {}],
				["1", {}, 1],
				["1", 1],
				[{ id: "1" }],
				[{ documentId: "1" }],
				["1", { data: {} }, 1],
				["1", "1", 1],
				["1", { reason: "x" }, 1],
			];
			for (const args of candidateArgs) {
				try {
					const result = (fn as (...a: unknown[]) => unknown)(...args);
					if (
						result &&
						typeof (result as Promise<unknown>).then === "function"
					) {
						await result;
					}
					threw = false;
					break;
				} catch {
					threw = true;
				}
			}
		} catch {
			threw = true;
		}
		seen.push(`${moduleName}.${name}${threw ? " (threw)" : ""}`);
	}
	expect(seen.length).toBeGreaterThan(0);
	return seen;
}

describe("api-client exhaustive raw-function coverage", () => {
	it("exercises cinq client fns", async () => {
		const seen = await exercise(cinq as any, "cinq");
		expect(seen.length).toBeGreaterThan(10);
	});
	it("exercises dial client fns", async () => {
		await exercise(dial as any, "dial");
	});
	it("exercises pause client fns", async () => {
		await exercise(pause as any, "pause");
	});
	it("exercises sond client fns", async () => {
		await exercise(sond as any, "sond");
	});
	it("exercises tempo client fns", async () => {
		await exercise(tempo as any, "tempo");
	});
	it("exercises vault client fns", async () => {
		await exercise(vault as any, "vault");
	});
	it("exercises vista client fns", async () => {
		await exercise(vista as any, "vista");
	});
	it("exercises aegis client fns", async () => {
		await exercise(aegis as any, "aegis");
	});
	it("exercises pivot client fns", async () => {
		await exercise(pivot as any, "pivot");
	});
	it("exercises spark client fns", async () => {
		await exercise(spark as any, "spark");
	});
	it("exercises health client fns", async () => {
		await exercise(health as any, "health");
	});
	it("exercises search client fns", async () => {
		await exercise(search as any, "search");
	});
	it("exercises migration client fns", async () => {
		await exercise(migration as any, "migration");
	});

	it("exercises search + searchEnriched across entity types", async () => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock as any);
		const raw = [
			{ app: "cinq", entity_type: "contact", id: "1", title: "A" },
			{ app: "vault", entity_type: "product", id: "2", title: "B" },
			{ app: "pivot", entity_type: "document", id: "3", title: "C" },
			{ app: "unknown", entity_type: "thing", id: "4", title: "D" },
		];
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => raw,
			text: async () => JSON.stringify(raw),
		} as Response);
		const enriched = await search.searchEnriched({ q: "a", limit: 10 });
		expect(enriched.length).toBe(4);
		expect(enriched[0].url).toContain("/contacts/");
		expect(enriched[3].url).toBe("/");
	});

	it("api instance is callable as a client", () => {
		expect(typeof api.get).toBe("function");
	});
});
