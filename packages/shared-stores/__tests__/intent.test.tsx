// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	INTENT_TTL_MS,
	intentKey,
	requestIntent,
	resetIntentIds,
	useIntent,
	useIntentStore,
	useIntents,
} from "../src/intent";

const reset = () => {
	useIntentStore.getState().clear();
	resetIntentIds();
};

beforeEach(reset);
afterEach(reset);

describe("intent store", () => {
	it("enqueues requests with monotonic ids and the payload", () => {
		const store = useIntentStore.getState();
		const first = store.request("cinq", "contact.create", { from: "palette" });
		const second = store.request("cinq", "deal.create");
		expect([first, second]).toEqual([1, 2]);

		const [a, b] = useIntentStore.getState().requests;
		expect(a).toMatchObject({
			id: 1,
			app: "cinq",
			intent: "contact.create",
			payload: { from: "palette" },
		});
		expect(b.payload).toBeUndefined();
	});

	it("consumes exactly the ids it is given", () => {
		const store = useIntentStore.getState();
		const a = store.request("dial", "channel.create");
		store.request("dial", "channel.create");
		useIntentStore.getState().consume([a]);
		const remaining = useIntentStore.getState().requests;
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).not.toBe(a);
	});

	it("keeps the same state reference when consuming nothing", () => {
		useIntentStore.getState().request("dial", "channel.create");
		const before = useIntentStore.getState().requests;
		useIntentStore.getState().consume([]);
		expect(useIntentStore.getState().requests).toBe(before);
	});

	it("prunes requests older than the ttl", () => {
		const now = Date.now();
		vi.spyOn(Date, "now").mockReturnValue(now - INTENT_TTL_MS - 1);
		useIntentStore.getState().request("sond", "form.publish");
		vi.spyOn(Date, "now").mockReturnValue(now);
		useIntentStore.getState().request("sond", "form.publish");
		vi.restoreAllMocks();

		useIntentStore.getState().prune();
		const remaining = useIntentStore.getState().requests;
		expect(remaining).toHaveLength(1);
		expect(remaining[0].at).toBe(now);
	});

	it("exposes an imperative request helper", () => {
		requestIntent("aegis", "user.invite", { role: "member" });
		expect(useIntentStore.getState().requests[0]).toMatchObject({
			app: "aegis",
			intent: "user.invite",
			payload: { role: "member" },
		});
	});

	it("builds a stable composite key", () => {
		expect(intentKey("vault", "product.create")).toBe("vault:product.create");
	});
});

describe("useIntents", () => {
	it("delivers a request exactly once", async () => {
		const handler = vi.fn();
		const Consumer = () => {
			useIntents("cinq", { "contact.create": handler });
			return null;
		};
		render(<Consumer />);

		await act(async () => {
			requestIntent("cinq", "contact.create", { id: "c1" });
		});

		await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
		expect(handler).toHaveBeenCalledWith({ id: "c1" });
		// Consumed: nothing left in the queue, and re-rendering does not redeliver.
		expect(useIntentStore.getState().requests).toHaveLength(0);
	});

	it("leaves other apps' requests queued for their own consumer", async () => {
		const cinq = vi.fn();
		const dial = vi.fn();
		const Consumer = () => {
			useIntents("cinq", { "contact.create": cinq });
			useIntents("dial", { "channel.create": dial });
			return null;
		};
		render(<Consumer />);

		await act(async () => {
			requestIntent("dial", "channel.create");
		});

		await waitFor(() => expect(dial).toHaveBeenCalledTimes(1));
		expect(cinq).not.toHaveBeenCalled();
		expect(useIntentStore.getState().requests).toHaveLength(0);
	});

	it("keeps intents the consumer does not handle queued", async () => {
		const handler = vi.fn();
		const Consumer = () => {
			useIntents("sond", { "form.publish": handler });
			return null;
		};
		render(<Consumer />);

		await act(async () => {
			requestIntent("sond", "question.add");
		});

		await waitFor(() => expect(handler).not.toHaveBeenCalled());
		expect(useIntentStore.getState().requests).toHaveLength(1);
	});

	it("delivers requests enqueued before the consumer mounts (navigation race)", async () => {
		requestIntent("pivot", "db.create");
		const handler = vi.fn();
		const Consumer = () => {
			useIntents("pivot", { "db.create": handler });
			return null;
		};
		render(<Consumer />);
		await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
	});

	it("uses the latest handler without re-subscribing", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const Consumer = ({ handler }: { handler: () => void }) => {
			useIntents("tempo", { "event-type.create": handler });
			return <span data-testid="consumer" />;
		};
		const { rerender } = render(<Consumer handler={first} />);
		rerender(<Consumer handler={second} />);
		expect(screen.getByTestId("consumer")).toBeInTheDocument();

		await act(async () => {
			requestIntent("tempo", "event-type.create");
		});
		await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
		expect(first).not.toHaveBeenCalled();
	});
});

describe("useIntent", () => {
	it("routes a single intent to its handler", async () => {
		const handler = vi.fn();
		const Consumer = () => {
			useIntent("vault", "product.create", handler);
			return null;
		};
		render(<Consumer />);
		await act(async () => {
			requestIntent("vault", "product.create", { sku: "A-1" });
		});
		await waitFor(() => expect(handler).toHaveBeenCalledWith({ sku: "A-1" }));
	});
});
