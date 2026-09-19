import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@ataqu/api-client";
import { useOptimisticMutation } from "../src/use-optimistic";

type Item = { id: string; done: boolean; version: number };
type Page = { items: Item[]; total: number; limit: number; offset: number };

const listKey = ["test", "items"];
const initialPage: Page = {
	items: [{ id: "a", done: false, version: 1 }],
	total: 1,
	limit: 100,
	offset: 0,
};

let queryClient: QueryClient | undefined;

beforeEach(() => {
	queryClient?.clear();
});

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { qc, Wrapper };
}

describe("useOptimisticMutation", () => {
	it("paints the cache immediately, then commits the server value", async () => {
		const { qc, Wrapper } = createWrapper();
		queryClient = qc;
		qc.setQueryData<Page>(listKey, structuredClone(initialPage));

		// A deferred server response lets us observe the optimistic paint
		// while the mutation is still in flight.
		let resolveServer!: (value: Item) => void;
		const commit = vi.fn(
			(): Promise<Item> =>
				new Promise<Item>((resolve) => {
					resolveServer = resolve;
				}),
		);

		const { result } = renderHook(
			() =>
				useOptimisticMutation<Item, Page>({
					listQueryKey: listKey,
					optimisticUpdate: (old, vars) => ({
						...old,
						items: old.items.map((item) =>
							item.id === vars.id ? { ...item, done: vars.done } : item,
						),
					}),
					mutationFn: () => commit(),
					mergeServer: (old, server) => ({
						...old,
						items: old.items.map((item) =>
							item.id === server.id ? server : item,
						),
					}),
				}),
			{ wrapper: Wrapper },
		);

		await act(async () => {
			result.current.mutate({ id: "a", done: true, version: 1 });
		});

		// Optimistic paint is visible BEFORE the server responds.
		const painted = qc.getQueryData<Page>(listKey)?.items[0];
		expect(painted?.done).toBe(true);
		expect(painted?.version).toBe(1);
		expect(commit).toHaveBeenCalledTimes(1);

		// Server commits its authoritative value.
		await act(async () => {
			resolveServer({ id: "a", done: true, version: 2 });
		});
		expect(qc.getQueryData<Page>(listKey)?.items[0]?.version).toBe(2);
	});

	it("rolls back the cache snapshot on failure", async () => {
		const { qc, Wrapper } = createWrapper();
		queryClient = qc;
		qc.setQueryData<Page>(listKey, structuredClone(initialPage));

		type FailVars = { id: string; fail: boolean };

		const { result } = renderHook(
			() =>
				useOptimisticMutation<FailVars, Page>({
					listQueryKey: listKey,
					optimisticUpdate: (old, vars) => ({
						...old,
						items: old.items.map((item) =>
							item.id === vars.id ? { ...item, done: !vars.fail } : item,
						),
					}),
					mutationFn: async (vars: FailVars) => {
						if (vars.fail) throw new Error("boom");
						return vars;
					},
				}),
			{ wrapper: Wrapper },
		);

		let caught: unknown;
		await act(async () => {
			caught = await result.current
				.mutateAsync({ id: "a", fail: true })
				.catch((error: unknown) => error);
		});

		expect(caught).toBeInstanceOf(Error);
		expect(qc.getQueryData(listKey)).toEqual(initialPage);
	});

	it("surfaces ConflictError for 409/412 handling upstream", async () => {
		const { qc, Wrapper } = createWrapper();
		queryClient = qc;
		qc.setQueryData<Page>(listKey, structuredClone(initialPage));

		const conflict = new ConflictError("stale", "version_conflict", undefined, 9);

		const { result } = renderHook(
			() =>
				useOptimisticMutation<Record<string, never>, Page>({
					listQueryKey: listKey,
					optimisticUpdate: (old) => old,
					mutationFn: async () => {
						throw conflict;
					},
				}),
			{ wrapper: Wrapper },
		);

		let caught: unknown;
		await act(async () => {
			caught = await result.current
				.mutateAsync({})
				.catch((error: unknown) => error);
		});

		expect(caught).toBe(conflict);
		expect(qc.getQueryData(listKey)).toEqual(initialPage);
	});
});
