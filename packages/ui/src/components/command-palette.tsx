/// <reference types="vite/client" />

import { searchEnriched, type UnifiedSearchResult } from "@ataqu/api-client";
import { GO_TO_TARGETS, useDebounce, useShortcut } from "@ataqu/shared-hooks";
import {
	registerRecent,
	useAuthStore,
	useRecentStore,
} from "@ataqu/shared-stores";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import { Home, LogOut, Plus, Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { type AppCommand, useAllCommands } from "../command-registry";
import { APP_HOME } from "./shell";

const APP_NAMES: Record<string, string> = {
	aegis: "AEGIS",
	cinq: "CINQ",
	dial: "DIAL",
	pivot: "PIVOT",
	spark: "SPARK",
	tempo: "TEMPO",
	sond: "SOND",
	vault: "VAULT",
	pause: "PAUSE",
	vista: "VISTA",
};

const APP_ICONS: Record<string, string> = {
	aegis: "/apps/aegis.png",
	cinq: "/apps/cinq.png",
	dial: "/apps/dial.png",
	pivot: "/apps/pivot.png",
	spark: "/apps/spark.png",
	tempo: "/apps/tempo.png",
	sond: "/apps/sond.png",
	vault: "/apps/vault.png",
	pause: "/apps/pause.png",
	vista: "/apps/vista.png",
};

export interface CommandPaletteProps {
	searchFn?: (q: string) => Promise<unknown[]>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ searchFn }) => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UnifiedSearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const debouncedSearch = useDebounce(query, 300);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const { logout } = useAuthStore();
	const appCommands = useAllCommands();
	// Recents (brainstorm P2-1 / F2): every selection below pushes onto the
	// persisted recent store; the "Recent" group renders them on open so the
	// palette starts one keystroke from what you did last session.
	const recents = useRecentStore((s) => s.recents);
	// Context scope (brainstorm P2-1): commands scoped to the app in view
	// lead the palette in an "In <APP>" group; the rest keep their place in
	// "Commands". Matches Shell's activeApp derivation (first path segment,
	// aegis as the default for the admin surfaces). Read from
	// `window.location` rather than `useLocation` so the palette keeps
	// working outside a router context (render sweeps, embeds); it is
	// re-read on every open because toggling `open` re-renders the component.
	const locationSeg =
		(typeof window !== "undefined" ? window.location.pathname : "/")
			.split("/")
			.filter(Boolean)[0] ?? "";
	const currentApp = APP_NAMES[locationSeg] ? locationSeg : "aegis";
	const scopedCommands = appCommands.filter((c) => c.scope === currentApp);
	const otherCommands = appCommands.filter((c) => c.scope !== currentApp);
	// Cross-app creation (brainstorm F3): every registered command tagged
	// with `createName` surfaces here, so creation never requires navigating
	// to the owning app first. Rendered in registrar order for stability.
	const createCommands = appCommands.filter(
		(c): c is AppCommand & { createName: string } =>
			c.createName !== undefined && c.scope !== currentApp,
	);
	// The `g <letter>` map is the only real app-switcher binding (see the
	// shared shortcut registry): the palette must label switches with those
	// chords, not with `⌘<first letter>`, which nothing binds (brainstorm
	// P2-2 — "kill the fake ⌘D/⌘S/⌘<letter> labels").
	const toLetter = (targetName: string): string | undefined => {
		for (const [letter, target] of Object.entries(GO_TO_TARGETS)) {
			if (target.toLowerCase() === targetName.toLowerCase()) return letter;
		}
		return undefined;
	};
	const appCount = Object.keys(APP_HOME).length;

	// mod+k toggles the palette via the shared keyboard engine (P2) instead of
	// an ad-hoc document listener. Modifier chords fire even while typing in
	// inputs, and Radix dialogs close on Escape natively.
	useShortcut("mod+k", () => setOpen((o) => !o));

	// Live unified search across all apps.
	useEffect(() => {
		const q = debouncedSearch.trim();
		if (!q) {
			setResults([]);
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const run = searchFn
			? searchFn(q).then((r) => r as UnifiedSearchResult[])
			: searchEnriched({ q, limit: 20 });
		run
			.then((r) => {
				if (!cancelled) setResults(r);
			})
			.catch(() => {
				if (!cancelled) setResults([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [debouncedSearch, searchFn]);

	const handleSelect = (callback: () => void) => {
		setOpen(false);
		callback();
	};

	// All results resolve to in-app routes in the consolidated single-origin
	// shell — navigate with the router, never via window.location. Opening a
	// result also records it as a recent (brainstorm P2-1 / F2).
	const openResult = (item: UnifiedSearchResult) => {
		registerRecent(
			item.app,
			`${item.entity_type}:${item.id}`,
			item.title,
			item.url,
		);
		navigate({ to: item.url as never });
	};

	const focusSearch = () => {
		setOpen(true);
		// Defer focus until the dialog is mounted.
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandInput
				ref={inputRef}
				placeholder="Search across all apps, or type a command..."
				value={query}
				onValueChange={setQuery}
			/>
			{/* Bump the default 300px cap: Recent + context + switch + commands
			    + navigation otherwise overflow into scroll on first open (P2-1). */}
			<CommandList className="max-h-[min(70vh,560px)]">
				<CommandEmpty>
					{loading ? "Searching..." : "No results found."}
				</CommandEmpty>
				{/* Recent (P2-1): shown while the query is empty so recents never
				    compete with live search. A recent whose command is still
				    registered replays the command; otherwise it navigates to the
				    stored href. */}
				{query.trim().length === 0 && recents.length > 0 && (
					<CommandGroup heading={`Recent (${Math.min(recents.length, 5)})`}>
						{recents.slice(0, 5).map((recent) => {
							const cmd = appCommands.find((c) => c.id === recent.intent);
							// Command recents are stored under app "command"; recover the
							// owning app from the command-id prefix (`cinq-create-contact`
							// → cinq) so the row still shows the right icon and badge.
							const ownerApp = APP_NAMES[recent.app]
								? recent.app
								: Object.keys(APP_NAMES).find((a) =>
										recent.intent.startsWith(`${a}-`),
									);
							return (
								<CommandItem
									key={recent.id}
									value={`recent ${recent.label}`}
									onSelect={() =>
										handleSelect(() => {
											if (cmd) cmd.onSelect();
											else if (recent.href)
												navigate({ to: recent.href as never });
										})
									}
								>
									{cmd?.icon ?? (
										<img
											src={APP_ICONS[ownerApp ?? "aegis"]}
											alt=""
											className="h-4 w-4 mr-2 rounded-sm"
										/>
									)}
									<span>{recent.label}</span>
									<span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
										{ownerApp ? APP_NAMES[ownerApp] : recent.app}
									</span>
								</CommandItem>
							);
						})}
					</CommandGroup>
				)}
				{/* Context scope (P2-1): the current app's own commands lead, so
				    "what can I do here" never requires scrolling past the other
				    nine apps' commands. */}
				{scopedCommands.length > 0 && (
					<CommandGroup
						heading={`In ${APP_NAMES[currentApp]} (${scopedCommands.length})`}
					>
						{scopedCommands.map((cmd) => (
							<CommandItem
								key={cmd.id}
								value={`${cmd.title} ${cmd.keywords ?? ""} in ${currentApp}`}
								onSelect={() =>
									handleSelect(() => {
										registerRecent(currentApp, cmd.id, cmd.title);
										cmd.onSelect();
									})
								}
							>
								{cmd.icon ?? (
									<img
										src={APP_ICONS[currentApp]}
										alt=""
										className="h-4 w-4 mr-2 rounded-sm"
									/>
								)}
								<span>{cmd.title}</span>
								{cmd.shortcut && (
									<span className="ml-auto text-xs text-muted-foreground">
										{cmd.shortcut}
									</span>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				)}
				<CommandGroup heading={`Switch App (${appCount} apps)`}>
					{Object.keys(APP_HOME).map((app) => (
						<CommandItem
							key={app}
							onSelect={() =>
								handleSelect(() => {
									registerRecent(
										app,
										"switch",
										APP_NAMES[app] ?? app,
										APP_HOME[app],
									);
									navigate({ to: APP_HOME[app] as never });
								})
							}
						>
							<img
								src={APP_ICONS[app]}
								alt={APP_NAMES[app]}
								className="h-5 w-5 mr-2"
							/>
							<span>{APP_NAMES[app]}</span>
							{(() => {
								const letter = toLetter(APP_NAMES[app]);
								return letter ? (
									<span className="ml-auto text-xs text-muted-foreground">
										g {letter}
									</span>
								) : null;
							})()}
						</CommandItem>
					))}
				</CommandGroup>
				{results.length > 0 && (
					<CommandGroup heading="Search Results">
						{results.map((item) => (
							<CommandItem
								key={`${item.app}-${item.entity_type}-${item.id}`}
								value={`${item.appName} ${item.entity_type} ${item.title} ${item.subtitle ?? ""}`}
								onSelect={() => handleSelect(() => openResult(item))}
							>
								<img
									src={APP_ICONS[item.app]}
									alt={item.appName}
									className="h-4 w-4 mr-2 rounded-sm"
								/>
								<span className="font-medium">{item.title}</span>
								{item.subtitle && (
									<span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px]">
										{item.subtitle}
									</span>
								)}
								<span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
									{item.appName} · {item.entity_type}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
				{otherCommands.length > 0 && (
					<CommandGroup heading={`Commands (${otherCommands.length})`}>
						{otherCommands.map((cmd) => (
							<CommandItem
								key={cmd.id}
								value={`${cmd.title} ${cmd.keywords ?? ""}`}
								onSelect={() =>
									handleSelect(() => {
										registerRecent("command", cmd.id, cmd.title);
										cmd.onSelect();
									})
								}
							>
								{cmd.icon ?? <Search className="mr-2 h-4 w-4" />}
								<span>{cmd.title}</span>
								{cmd.shortcut && (
									<span className="ml-auto text-xs text-muted-foreground">
										{cmd.shortcut}
									</span>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				)}
				{/* Cross-app creation (F3): every registered command tagged with
				    `createName` surfaces here, scoped to the other apps so the
				    current app's own creates stay in its context group. */}
				{createCommands.length > 0 && (
					<CommandGroup heading={`Create (${createCommands.length})`}>
						{createCommands.map((cmd) => (
							<CommandItem
								key={`create-${cmd.id}`}
								value={`create ${cmd.createName} new ${cmd.title} ${cmd.keywords ?? ""}`}
								onSelect={() =>
									handleSelect(() => {
										registerRecent(cmd.scope ?? "command", cmd.id, cmd.title);
										cmd.onSelect();
									})
								}
							>
								{cmd.icon ?? <Plus className="mr-2 h-4 w-4" />}
								<span>{cmd.createName}</span>
								<span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
									{cmd.scope ? (APP_NAMES[cmd.scope] ?? cmd.scope) : ""}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
				<CommandGroup heading="Navigation">
					<CommandItem
						onSelect={() =>
							handleSelect(() => {
								registerRecent("aegis", "dashboard", "Dashboard", "/dashboard");
								navigate({ to: "/dashboard" });
							})
						}
					>
						<Home className="mr-2 h-4 w-4" />
						<span>Dashboard</span>
						<span className="ml-auto text-xs text-muted-foreground">g d</span>
					</CommandItem>
					<CommandItem onSelect={() => handleSelect(focusSearch)}>
						<Search className="mr-2 h-4 w-4" />
						<span>Global Search</span>
					</CommandItem>
				</CommandGroup>
				<CommandGroup heading="Account">
					<CommandItem onSelect={() => handleSelect(logout)}>
						<LogOut className="mr-2 h-4 w-4" />
						<span>Sign Out</span>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
};
