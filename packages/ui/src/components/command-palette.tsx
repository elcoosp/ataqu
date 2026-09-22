/// <reference types="vite/client" />

import { searchEnriched, type UnifiedSearchResult } from "@ataqu/api-client";
import { GO_TO_TARGETS, useDebounce, useShortcut } from "@ataqu/shared-hooks";
import { useAuthStore } from "@ataqu/shared-stores";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@ataqu/ui";
import { useNavigate } from "@tanstack/react-router";
import { Home, LogOut, Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useAllCommands } from "../command-registry";
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
	// shell — navigate with the router, never via window.location.
	const openResult = (item: UnifiedSearchResult) => {
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
			<CommandList>
				<CommandEmpty>
					{loading ? "Searching..." : "No results found."}
				</CommandEmpty>
				<CommandGroup heading={`Switch App (${appCount} apps)`}>
					{Object.keys(APP_HOME).map((app) => (
						<CommandItem
							key={app}
							onSelect={() =>
								handleSelect(() => navigate({ to: APP_HOME[app] as never }))
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
				{appCommands.length > 0 && (
					<CommandGroup heading="Commands">
						{appCommands.map((cmd) => (
							<CommandItem
								key={cmd.id}
								value={`${cmd.title} ${cmd.keywords ?? ""}`}
								onSelect={() => handleSelect(cmd.onSelect)}
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
				<CommandGroup heading="Navigation">
					<CommandItem
						onSelect={() => handleSelect(() => navigate({ to: "/dashboard" }))}
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
