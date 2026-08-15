/// <reference types="vite/client" />

import { searchEnriched, type UnifiedSearchResult } from "@ataqu/api-client";
import { useDebounce } from "@ataqu/shared-hooks";
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

const APP_DOMAINS: Record<string, string> = {
	aegis: "sso",
	cinq: "crm",
	dial: "chat",
	pivot: "docs",
	spark: "auto",
	tempo: "schedule",
	sond: "forms",
	vault: "inv",
	pause: "hr",
	vista: "bi",
};

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

const APP_PORTS: Record<string, number> = {
	aegis: 5173,
	cinq: 5174,
	dial: 5175,
	pivot: 5176,
	spark: 5177,
	tempo: 5178,
	sond: 5179,
	vault: 5180,
	pause: 5181,
	vista: 5182,
};

function getAppUrl(app: string): string {
	if (import.meta.env.DEV) {
		return `http://localhost:${APP_PORTS[app]}`;
	}
	return `https://${APP_DOMAINS[app]}.ataqu.com`;
}

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

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

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

	// Cross-app results open the target app at its deep link; in-app results
	// use the router for a seamless SPA transition.
	const openResult = (item: UnifiedSearchResult) => {
		const target = `${getAppUrl(item.app)}${item.url}`;
		if (typeof window !== "undefined") {
			window.location.href = target;
		}
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
				<CommandGroup heading="Switch App">
					{Object.keys(APP_DOMAINS).map((app) => (
						<CommandItem
							key={app}
							onSelect={() =>
								handleSelect(() => (window.location.href = getAppUrl(app)))
							}
						>
							<img
								src={APP_ICONS[app]}
								alt={APP_NAMES[app]}
								className="h-5 w-5 mr-2"
							/>
							<span>{APP_NAMES[app]}</span>
							<span className="ml-auto text-xs text-muted-foreground">
								⌘{app[0]}
							</span>
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
						<span className="ml-auto text-xs text-muted-foreground">⌘D</span>
					</CommandItem>
					<CommandItem onSelect={() => handleSelect(focusSearch)}>
						<Search className="mr-2 h-4 w-4" />
						<span>Global Search</span>
						<span className="ml-auto text-xs text-muted-foreground">⌘S</span>
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
