"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, Inbox } from "lucide-react";
import type React from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export interface QueryBoundaryProps<T> {
	/** The react-query result to interpret. */
	query: Pick<
		UseQueryResult<T, unknown>,
		"isPending" | "isError" | "error" | "data" | "refetch"
	>;
	/** Skeleton to show while pending. Defaults to a generic block skeleton. */
	skeleton?: React.ReactNode;
	/**
	 * Emptiness predicate. When it returns true the empty state renders.
	 * Defaults to: array-like with length 0, or null/undefined.
	 */
	isEmpty?: (data: T) => boolean;
	/** Copy for the empty state. */
	emptyTitle?: React.ReactNode;
	emptyDescription?: React.ReactNode;
	emptyAction?: React.ReactNode;
	/** Copy overrides for the error state. */
	errorTitle?: React.ReactNode;
	/** Render the raw error message under the title (default true). */
	showErrorMessage?: boolean;
	/** Extra wrapper classes. */
	className?: string;
	children: (data: T) => React.ReactNode;
}

function defaultIsEmpty(data: unknown): boolean {
	if (data === null || data === undefined) return true;
	if (Array.isArray(data)) return data.length === 0;
	// Paginated envelopes: { items: [...] }
	if (typeof data === "object" && "items" in (data as object)) {
		const items = (data as { items?: unknown }).items;
		return Array.isArray(items) && items.length === 0;
	}
	return false;
}

/**
 * QueryBoundary (brainstorm P1-4) — the single place that decides between
 * pending / error / empty / data, so no screen renders a bare "Loading..."
 * string and none renders an empty state while still fetching.
 *
 * The `children` prop is a render function, which forces the data branch to
 * be non-nullable — eliminating the `data && ...` dance that produced the
 * fleet-wide `pivot/index.tsx:54` bug.
 */
export function QueryBoundary<T>({
	query,
	skeleton,
	isEmpty = defaultIsEmpty as (data: T) => boolean,
	emptyTitle = "Nothing here yet",
	emptyDescription,
	emptyAction,
	errorTitle = "Something went wrong",
	showErrorMessage = true,
	className,
	children,
}: QueryBoundaryProps<T>) {
	if (query.isPending) {
		return (
			<div className={cn("w-full", className)} data-query-state="pending">
				{skeleton ?? <Skeleton className="h-32 w-full" />}
			</div>
		);
	}

	if (query.isError) {
		const message =
			query.error instanceof Error ? query.error.message : String(query.error);
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-3 py-16 text-center",
					className,
				)}
				data-query-state="error"
				role="alert"
			>
				<AlertTriangle
					className="h-8 w-8 text-destructive"
					aria-hidden="true"
				/>
				<h3 className="text-lg font-heading font-semibold">{errorTitle}</h3>
				{showErrorMessage && message && (
					<p className="max-w-md text-sm text-muted-foreground">{message}</p>
				)}
				<Button variant="outline" size="sm" onClick={() => query.refetch()}>
					Try again
				</Button>
			</div>
		);
	}

	if (isEmpty(query.data as T)) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-3 py-16 text-center",
					className,
				)}
				data-query-state="empty"
			>
				<Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
				<h3 className="text-lg font-heading font-semibold">{emptyTitle}</h3>
				{emptyDescription && (
					<p className="max-w-sm text-sm text-muted-foreground">
						{emptyDescription}
					</p>
				)}
				{emptyAction}
			</div>
		);
	}

	return (
		<div className={cn("w-full", className)} data-query-state="data">
			{children(query.data as T)}
		</div>
	);
}
