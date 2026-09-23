"use client";

import type React from "react";
import { CircleAlert } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

export interface ConflictOptions {
	/** Record label, e.g. "Contact", "Workflow". */
	entity?: string;
	/** How the conflicting edit was made, for the explanatory line. */
	lastWriter?: string;
}

/**
 * ConflictProvider (brainstorm F6) — one mounted conflict dialog for the
 * whole suite, driven imperatively. When an If-Match update fails with
 * 409/412, the optimistic edit is already rolled back; the dialog tells the
 * user what happened and offers the two Linear-grade outs:
 *
 *   - "Reload" — invalidate every query so the fresh server state appears.
 *   - "Keep mine" — leave the rolled-back UI alone so the user can inspect
 *     the current record and retry (with the fresh version number).
 *
 * Usage:
 *   const handleConflict = useConflict();
 *   onError: (err) => {
 *     if (isConflictError(err)) return void handleConflict({ entity: "Contact" });
 *     toast.error(handleApiError(err));
 *   }
 */

/** Resolution the caller awaits from the conflict dialog. */
export type ConflictResolution = "reload" | "keep";

export type ConflictFn = (
	options?: ConflictOptions,
) => Promise<ConflictResolution>;

const ConflictContext = createContext<ConflictFn | null>(null);

export const ConflictProvider: React.FC<{
	children: React.ReactNode;
	onReload?: () => void;
}> = ({ children, onReload }) => {
	const [options, setOptions] = useState<ConflictOptions | null>(null);
	const [open, setOpen] = useState(false);
	// Resolver for the pending promise. A ref (not state) so resolving does
	// not schedule a render.
	const resolverRef = useRef<((value: ConflictResolution) => void) | null>(
		null,
	);

	const settle = useCallback((value: ConflictResolution) => {
		resolverRef.current?.(value);
		resolverRef.current = null;
	}, []);

	const requestConflict = useCallback<ConflictFn>((next) => {
		// If a dialog is somehow already open, resolve the previous promise
		// "keep" rather than leaking it.
		resolverRef.current?.("keep");
		setOptions(next ?? {});
		setOpen(true);
		return new Promise<ConflictResolution>((resolve) => {
			resolverRef.current = resolve;
		});
	}, []);

	// If the provider unmounts mid-prompt, settle so callers never hang.
	useEffect(
		() => () => {
			resolverRef.current?.("keep");
			resolverRef.current = null;
		},
		[],
	);

	const value = useMemo(() => requestConflict, [requestConflict]);

	return (
		<ConflictContext.Provider value={value}>
			{children}
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					// Dismissed via Escape / overlay / X → resolve "keep".
					if (!next) settle("keep");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<span className="inline-flex items-center gap-2">
								<CircleAlert
									className="h-5 w-5 text-warning"
									aria-hidden="true"
								/>
								{options?.entity
									? `This ${options.entity} changed`
									: "This record changed"}
							</span>
						</DialogTitle>
						<DialogDescription>
							{options?.lastWriter ? `${options.lastWriter}. ` : ""}
							Someone else saved a newer version while you were editing.
							Your optimistic edit was rolled back. Reload to see their
							version, or keep yours and inspect before retrying.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								settle("keep");
								setOpen(false);
							}}
						>
							Keep mine
						</Button>
						<Button
							onClick={() => {
								settle("reload");
								setOpen(false);
								onReload?.();
							}}
						>
							Reload
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ConflictContext.Provider>
	);
};

/**
 * Convenience accessor to open the conflict dialog and await the resolution
 * ("reload" | "keep"). Throws outside a {@link ConflictProvider}.
 */
export const useConflict = (): ConflictFn => {
	const ctx = useContext(ConflictContext);
	if (!ctx) {
		throw new Error("useConflict must be used within a ConflictProvider");
	}
	return ctx;
};

/**
 * Duck-typed 409/412 detector (brainstorm F6). A hard dependency on
 * `@ataqu/api-client` is banned here — `shared-hooks` depends on
 * `shared-stores`, which `api-client` already imports, so importing
 * `ConflictError` into the stores would close a package cycle.
 */
export const isConflictError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	const anyErr = error as Record<string, unknown>;
	if (anyErr.name === "ConflictError") return true;
	if (anyErr.status === 409 || anyErr.status === 412) return true;
	return (
		typeof (error as { message?: unknown })?.message === "string" &&
		/Android|version conflict|If-Match|412/.test((error as { message: string }).message)
	);
};