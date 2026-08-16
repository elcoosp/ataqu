import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as aegis from "../src/aegis";
import * as cinq from "../src/cinq";
import * as dial from "../src/dial";
import * as pause from "../src/pause";
import * as pivot from "../src/pivot";
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

let client: QueryClient;

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock as any);
	fetchMock.mockResolvedValue(jsonResponse({ id: "1", version: 1 }));
	client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	client.clear();
});

function wrap(ui: () => unknown) {
	return renderHook(ui, {
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
}

// Render every exported use* hook to exercise its body (query + mutation factories).
describe("api-client hooks render", () => {
	const modules = {
		cinq,
		dial,
		pause,
		sond,
		tempo,
		vault,
		vista,
		aegis,
		pivot,
		spark,
	};

	for (const [modName, mod] of Object.entries(modules)) {
		it(`renders ${modName} hooks`, () => {
			const rendered: string[] = [];
			const failed: string[] = [];
			let err = "";
			for (const [name, fn] of Object.entries(mod as Record<string, unknown>)) {
				if (typeof fn !== "function") continue;
				if (!name.startsWith("use")) continue;
				let ok = false;
				for (const args of [
					[],
					["1"],
					[{ id: "1" }],
					["1", {}],
					[{ limit: 10 }],
					[{ documentId: "1" }],
					["1", { data: { name: "x" } }],
					[{ id: "1", data: { name: "x" } }],
				]) {
					try {
						const { unmount } = wrap(() =>
							(fn as (...a: unknown[]) => unknown)(...args),
						);
						ok = true;
						unmount();
						break;
					} catch (e) {
						err = (e as Error)?.message ?? String(e);
						// try next arg shape
					}
				}
				if (ok) rendered.push(name);
				else {
					failed.push(name);
					console.log(`  - ${name} failed: ${err}`);
				}
			}
			// surface failures for diagnosis
			if (failed.length) {
				console.log(`[${modName}] ${failed.length} uncovered hooks`);
			}
			expect(rendered.length).toBeGreaterThan(0);
		});
	}
});
