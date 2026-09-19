"use client";

import {
	formatShortcut,
	SHORTCUT_GROUPS,
	SHORTCUTS,
	type ShortcutDef,
	type ShortcutGroup,
} from "@ataqu/shared-hooks";
import { Search } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

/**
 * Keyboard shortcut cheat sheet (brainstorm P2-3).
 *
 * Opened with `?`. Rendered from the SAME `SHORTCUTS` registry the dispatcher
 * matches against, so a listed shortcut always has a handler — the "fake
 * chrome" bug (advertising ⌘D/⌘S with nothing bound) cannot recur.
 */
export function ShortcutHelp({
	open,
	onOpenChange,
	/** Extra bindings registered by the current app (shown under its own group). */
	extra,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	extra?: ShortcutDef[];
}) {
	const [query, setQuery] = React.useState("");

	const grouped = useMemo(() => {
		const all = [...SHORTCUTS, ...(extra ?? [])];
		const q = query.trim().toLowerCase();
		const filtered = q
			? all.filter(
					(s) =>
						s.label.toLowerCase().includes(q) ||
						s.keys.toLowerCase().includes(q) ||
						formatShortcut(s.keys).toLowerCase().includes(q),
				)
			: all;
		const map = new Map<ShortcutGroup, ShortcutDef[]>();
		for (const group of SHORTCUT_GROUPS) map.set(group, []);
		for (const shortcut of filtered) {
			const bucket = map.get(shortcut.group);
			if (bucket) bucket.push(shortcut);
			else map.set(shortcut.group, [shortcut]);
		}
		return [...map.entries()].filter(([, items]) => items.length > 0);
	}, [query, extra]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						Press a key sequence anywhere in the suite.
					</DialogDescription>
				</DialogHeader>

				<div className="relative">
					<Search
						className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						autoFocus
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Filter shortcuts…"
						className="pl-9"
						aria-label="Filter shortcuts"
					/>
				</div>

				<div className="max-h-[60vh] overflow-y-auto pr-1">
					{grouped.length === 0 && (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No shortcuts match “{query}”.
						</p>
					)}
					{grouped.map(([group, items]) => (
						<section key={group} className="mb-6 last:mb-0">
							<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{group}
							</h3>
							<ul className="divide-y divide-border/60">
								{items.map((shortcut) => (
									<li
										key={shortcut.id}
										className="flex items-center justify-between gap-4 py-2"
									>
										<span className="text-sm">{shortcut.label}</span>
										<Badge
											variant="secondary"
											className={cn(
												"shrink-0 font-mono text-[11px] tabular-nums",
											)}
										>
											{formatShortcut(shortcut.keys)}
										</Badge>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Mounts the `?` trigger and the overlay. Placed once, next to the command
 * palette, so every app gets the cheat sheet for free.
 */
export function ShortcutHelpProvider({ extra }: { extra?: ShortcutDef[] }) {
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "?") return;
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName;
			const typing =
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				tag === "SELECT" ||
				target?.isContentEditable === true;
			if (typing) return;
			event.preventDefault();
			setOpen((prev) => !prev);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	return <ShortcutHelp open={open} onOpenChange={setOpen} extra={extra} />;
}
