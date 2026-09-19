import { useAuthStore } from "@ataqu/shared-stores";
import { afterEach, expect, it, vi } from "vitest";
import { submitForm } from "../src/sond";

afterEach(() => vi.unstubAllGlobals());

it("posts public responses to the submit endpoint, not the authenticated listing", async () => {
	useAuthStore.setState({ token: null });
	const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
	vi.stubGlobal("fetch", fetchMock);
	await submitForm("form-id", { answers: [] });
	expect(fetchMock.mock.calls[0][0]).toBe("/api/sond/forms/form-id/submit");
	expect(fetchMock.mock.calls[0][1].method).toBe("POST");
});
