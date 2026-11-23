import { describe, expect, it, vi } from "vitest";
import { downloadBlob } from "../src/download";

describe("downloadBlob", () => {
	it("creates a download anchor and revokes the object URL", () => {
		const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
		const revoke = vi.spyOn(URL, "revokeObjectURL");
		const append = vi.spyOn(document.body, "appendChild");

		const blob = new Blob(["hello"], { type: "text/plain" });
		expect(() => downloadBlob(blob, "file.txt")).not.toThrow();

		expect(create).toHaveBeenCalledWith(blob);
		expect(append).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
		expect(revoke).toHaveBeenCalledWith("blob:test");

		append.mockRestore();
		create.mockRestore();
		revoke.mockRestore();
	});
});
