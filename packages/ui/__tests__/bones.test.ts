// packages/ui/__tests__/bones.test.ts
// Verifies boneyard's full capture/layout surface exposed from @ataqu/ui:
// registerBones, computeLayout (descriptor engine), renderBones (SSR string),
// and normalizeBone.

import { describe, expect, it } from "vitest";
import {
	computeLayout,
	normalizeBone,
	registerBones,
	renderBones,
	type SkeletonDescriptor,
} from "../src/bones";

const card = (children: SkeletonDescriptor[]): SkeletonDescriptor => ({
	display: "flex",
	flexDirection: "column",
	width: 1200,
	padding: 16,
	gap: 12,
	children,
});

describe("boneyard bones API (from @ataqu/ui)", () => {
	it("registers pre-captured bones without error", () => {
		const result = {
			name: "demo",
			viewportWidth: 1280,
			width: 1200,
			height: 200,
			bones: [
				[0, 0, 160, 24, 6, true],
				[0, 40, 1184, 44, 8],
			],
		};
		expect(() => registerBones({ demo: result })).not.toThrow();
	});

	it("normalizes compact tuples to object bones", () => {
		const b = normalizeBone([10, 20, 100, 40, 8, true]);
		expect(b).toEqual({ x: 10, y: 20, w: 100, h: 40, r: 8, c: true });
	});

	it("computes layout bones from a descriptor at a given width (no DOM)", () => {
		const skel = computeLayout(
			card([
				{ width: 160, height: 24, borderRadius: 6 },
				{ width: 1184, height: 44, borderRadius: 8 },
			]),
			1280,
			"demo2",
		);
		expect(skel.name).toBe("demo2");
		expect(skel.viewportWidth).toBe(1280);
		expect(Array.isArray(skel.bones)).toBe(true);
		expect(skel.bones.length).toBeGreaterThan(0);
	});

	it("renders bones to an HTML string for SSR", () => {
		const skel = computeLayout(
			card([{ width: 160, height: 24, borderRadius: 6 }]),
			1280,
			"demo3",
		);
		const html = renderBones(skel, "#f0f0f0", true);
		expect(typeof html).toBe("string");
		expect(html).toContain("position:absolute");
	});
});
