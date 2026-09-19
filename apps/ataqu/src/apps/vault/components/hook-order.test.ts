import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// These components previously returned during loading before calling state and
// mutation hooks, crashing when the next render received data.
describe("Vault loading-state hook order", () => {
	for (const file of ["product-detail.tsx", "movement-history.tsx"]) {
		it(`${file} calls every component hook before its first conditional return`, () => {
			const source = readFileSync(
				`${process.cwd()}/apps/ataqu/src/apps/vault/components/${file}`,
				"utf8",
			);
			const firstGuard = source.indexOf("\n\tif (");
			const hookDeclarations = [
				...source.matchAll(/^\tconst .*\buse[A-Z]\w*\(/gm),
			];
			expect(hookDeclarations.length).toBeGreaterThan(0);
			for (const hook of hookDeclarations) {
				expect(hook.index, hook[0]).toBeLessThan(firstGuard);
			}
		});
	}
});
