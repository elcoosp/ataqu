import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	approveWorkflowRun,
	deleteDLQ,
	deleteWorkflow,
	getWorkflow,
	getWorkflowRun,
	listDLQ,
	listWorkflowRuns,
	listWorkflows,
	replayDLQ,
	useListWorkflowRuns,
	useWorkflowRun,
} from "./spark-api";

describe("Spark API route mounting", () => {
	afterEach(() => vi.unstubAllGlobals());

	it.each([
		["list workflows", () => listWorkflows(), "GET", "/api/spark/workflows"],
		[
			"get workflow",
			() => getWorkflow("workflow-id"),
			"GET",
			"/api/spark/workflows/workflow-id",
		],
		[
			"delete workflow",
			() => deleteWorkflow("workflow-id"),
			"DELETE",
			"/api/spark/workflows/workflow-id",
		],
		["list runs", () => listWorkflowRuns(), "GET", "/api/spark/workflows/runs"],
		[
			"get run",
			() => getWorkflowRun("run-id"),
			"GET",
			"/api/spark/workflows/runs/run-id",
		],
		[
			"approve run",
			() => approveWorkflowRun("run-id"),
			"POST",
			"/api/spark/workflows/runs/run-id/approve",
		],
		["list DLQ", () => listDLQ(), "GET", "/api/spark/dlq"],
		[
			"replay DLQ",
			() => replayDLQ("entry-id"),
			"POST",
			"/api/spark/dlq/entry-id/replay",
		],
		[
			"delete DLQ",
			() => deleteDLQ("entry-id"),
			"DELETE",
			"/api/spark/dlq/entry-id",
		],
	] as const)(
		"%s uses the mounted Spark API",
		async (_name, call, method, path) => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(new Response("{}", { status: 200 }));
			vi.stubGlobal("fetch", fetchMock);
			await call();
			expect(fetchMock).toHaveBeenCalledWith(
				path,
				expect.objectContaining({ method }),
			);
		},
	);
});
type RefetchFn = (q: {
	state: {
		data?: { items?: Array<{ status?: string }> } | { status?: string };
	};
}) => number | false;

function jsonResponse(payload: unknown) {
	return new Response(JSON.stringify(payload), { status: 200 });
}

export function runsPayload(items: Array<{ id: string; status: string }>) {
	return { items, total: items.length, limit: 50, offset: 0 };
}

function wrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

/**
 * Runs the hook with the real QueryClient, waits for data, then returns the
 * `refetchInterval` callback the hook registered. TanStack keeps that value
 * on the observer, not on the hook result — so it is read back from the
 * query's defaulted options via the client cache.
 */
function readInterval(client: QueryClient, key: unknown): unknown {
	const cached = client.getQueryCache().find({ queryKey: key as never });
	const observers = (cached?.observers ?? []) as Array<{
		options?: unknown;
	}>;
	const query = observers.map((o) => o.options).at(0);
	const opts = (query ?? {}) as { refetchInterval?: RefetchFn };
	return opts.refetchInterval;
}

describe("Spark live refetch intervals (F5)", () => {
	async function listIntervalFor(statuses: string[]): Promise<number | false> {
		const payload = runsPayload(
			statuses.map((status, i) => ({ id: `run-${i}`, status })),
		);
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
		vi.stubGlobal("fetch", fetchMock);

		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const { result } = renderHook(() => useListWorkflowRuns({ limit: 50 }), {
			wrapper: (({ children }: { children: React.ReactNode }) =>
				createElement(QueryClientProvider, { client }, children)) as never,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		vi.unstubAllGlobals();
		const refetchInterval = readInterval(client, [
			"spark",
			"runs",
			{ limit: 50 },
		]);
		expect(typeof refetchInterval).toBe("function");
		return (refetchInterval as RefetchFn)({ state: { data: payload } });
	}

	it("polls fast while any run is live, slow when the list is settled", async () => {
		expect(await listIntervalFor(["running", "completed"])).toBe(3_000);
		expect(await listIntervalFor(["completed", "failed"])).toBe(10_000);
		expect(await listIntervalFor([])).toBe(10_000);
	});

	it("polls the open run while it is live and stops once it settles", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ id: "run-1", status: "running" }))
			.mockResolvedValue(jsonResponse({ id: "run-1", status: "completed" }));
		vi.stubGlobal("fetch", fetchMock);

		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const { result } = renderHook(() => useWorkflowRun("run-1"), {
			wrapper: (({ children }: { children: React.ReactNode }) =>
				createElement(QueryClientProvider, { client }, children)) as never,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		vi.unstubAllGlobals();
		const refetchInterval = readInterval(client, ["spark", "run", "run-1"]);
		expect(typeof refetchInterval).toBe("function");
		expect(
			(refetchInterval as RefetchFn)({
				state: { data: { status: "running" } },
			}),
		).toBe(3_000);
		expect(
			(refetchInterval as RefetchFn)({ state: { data: { status: "failed" } } }),
		).toBe(false);
	});
});
