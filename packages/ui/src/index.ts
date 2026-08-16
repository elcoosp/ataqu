import { configureBoneyard } from "boneyard-js/react";

export type { SkeletonProps as BoneProps } from "boneyard-js/react";
export { BoneSuspense, Skeleton as Bone } from "boneyard-js/react";

// Apply boneyard global defaults once, for every consumer of @ataqu/ui.
configureBoneyard({ animate: true });

// Full boneyard capture + layout API (snapshot, descriptor, registry, native scan).
export * from "./bones";

export * from "./command-registry";
export * from "./components/auth/LoginForm";
export * from "./components/auth/RegisterForm";
export { AuthLayout } from "./components/auth-layout";
export * from "./components/bulk-action-bar";
export * from "./components/changelog-bell";
export * from "./components/chart";
export * from "./components/command-palette";
export * from "./components/data-table";
export { EmptyState } from "./components/empty-state";
export * from "./components/form-builder";
export * from "./components/interior";
export * from "./components/kanban-board";
export * from "./components/layouts";
export * from "./components/onboard-tour";
export * from "./components/selection-checkbox";
export * from "./components/shell";
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/command";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/popover";
export * from "./components/ui/select";
export * from "./components/ui/sheet";
export * from "./components/ui/skeleton";
export * from "./components/ui/sonner";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/tooltip";
export * from "./components/workflow-canvas";
export * from "./lib/utils";
