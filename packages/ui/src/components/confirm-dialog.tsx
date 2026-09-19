"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";

export interface ConfirmOptions {
	title: React.ReactNode;
	description?: React.ReactNode;
	confirmLabel?: React.ReactNode;
	cancelLabel?: React.ReactNode;
	/** Render the confirm action as destructive (default true). */
	destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * ConfirmProvider (brainstorm P3-3) — one mounted alert dialog for the whole
 * suite, driven imperatively. Replaces the 4× `window.confirm(...)` calls,
 * which are unstyled, untranslatable, untestable, and unreachable by the
 * design system.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete 3 deals?", destructive: true })) { … }
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const [open, setOpen] = useState(false);
	// Resolver for the pending promise. A ref (not state) so resolving does
	// not schedule a render.
	const resolverRef = useRef<((value: boolean) => void) | null>(null);

	const settle = useCallback((value: boolean) => {
		resolverRef.current?.(value);
		resolverRef.current = null;
	}, []);

	const confirm = useCallback<ConfirmFn>((next) => {
		// If a dialog is somehow already open, resolve the previous promise
		// false rather than leaking it.
		resolverRef.current?.(false);
		setOptions(next);
		setOpen(true);
		return new Promise<boolean>((resolve) => {
			resolverRef.current = resolve;
		});
	}, []);

	// If the provider unmounts mid-prompt, settle so callers never hang.
	useEffect(
		() => () => {
			resolverRef.current?.(false);
			resolverRef.current = null;
		},
		[],
	);

	const value = useMemo(() => confirm, [confirm]);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<AlertDialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					// Dismissed via Escape / overlay / X → resolve false.
					if (!next) settle(false);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{options?.title}</AlertDialogTitle>
						{options?.description && (
							<AlertDialogDescription>
								{options.description}
							</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								settle(false);
								setOpen(false);
							}}
						>
							{options?.cancelLabel ?? "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							variant={
								options?.destructive === false ? "default" : "destructive"
							}
							onClick={() => {
								settle(true);
								setOpen(false);
							}}
						>
							{options?.confirmLabel ?? "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ConfirmContext.Provider>
	);
};

/**
 * Returns the imperative confirm function. Falls back to a native confirm
 * (and warns once) when no provider is mounted, so a missing provider
 * degrades instead of crashing in production.
 */
export function useConfirm(): ConfirmFn {
	const ctx = useContext(ConfirmContext);
	if (!ctx) {
		if (typeof console !== "undefined") {
			console.warn(
				"useConfirm() called without a <ConfirmProvider>; falling back to window.confirm.",
			);
		}
		return async (options) =>
			window.confirm(
				typeof options.title === "string" ? options.title : "Are you sure?",
			);
	}
	return ctx;
}
