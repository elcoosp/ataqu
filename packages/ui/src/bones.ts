// packages/ui/src/bones.ts
// Re-export boneyard's full capture + layout surface from @ataqu/ui so every
// app can leverage boneyard maximally from a single kit.
//
// DOM-driven capture (browser/dev-time): snapshotBones, fromElement, extractResponsive
// Descriptor-driven layout (SSR/build-time, no DOM): compileDescriptor, computeLayout, renderBones
// Bone registry (zero first-load flash): registerBones
// (React Native scan via BoneScan/BoneScanResponsive is excluded — it pulls in
//  the optional `react-native` peer, unused by these web apps.)

import type {
	AnyBone,
	Bone,
	CompactBone,
	CompiledSkeletonDescriptor,
	ResponsiveBones,
	ResponsiveDescriptor,
	SkeletonDescriptor,
	SkeletonResult,
	SnapshotConfig,
} from "boneyard-js";
import {
	compileDescriptor,
	computeLayout,
	extractResponsive,
	fromElement,
	invalidateDescriptor,
	normalizeBone,
	registerBones,
	renderBones,
	skeleton,
	snapshotBones,
} from "boneyard-js";

export type {
	AnyBone,
	Bone,
	CompactBone,
	CompiledSkeletonDescriptor,
	ResponsiveBones,
	ResponsiveDescriptor,
	SkeletonDescriptor,
	SkeletonResult,
	SnapshotConfig,
};
export {
	compileDescriptor,
	computeLayout,
	extractResponsive,
	fromElement,
	invalidateDescriptor,
	normalizeBone,
	registerBones,
	renderBones,
	skeleton,
	snapshotBones,
};
