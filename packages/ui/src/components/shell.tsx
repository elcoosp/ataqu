/// <reference types="vite/client" />

import { useHealth } from "@ataqu/api-client";
import { useAuthStore, useUIStore } from "@ataqu/shared-stores";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { CommandRegistryProvider } from "../command-registry";
import { Button } from "./button";
import { ChangelogBell } from "./changelog-bell";
import { CommandPalette } from "./command-palette";
import { InboxBell } from "./inbox-bell";
import { SetupProgressWidget } from "./setup-progress-widget";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

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

/** In-app home route for each app in the consolidated single-origin shell. */
export const APP_HOME: Record<string, string> = {
	aegis: "/dashboard",
	cinq: "/cinq/contacts",
	dial: "/dial",
	pivot: "/pivot",
	spark: "/spark",
	tempo: "/tempo/dashboard",
	sond: "/sond",
	vault: "/vault/products",
	pause: "/pause/directory",
	vista: "/vista",
};

export interface SidebarItem {
	label: string;
	href: string;
	icon?: React.ReactNode;
}

export interface ShellProps {
	activeApp: string;
	children: React.ReactNode;
	searchFn?: (q: string) => Promise<unknown[]>;
	extraSidebarItems?: SidebarItem[];
}

export const Shell: React.FC<ShellProps> = ({
	activeApp,
	children,
	searchFn,
	extraSidebarItems = [],
}) => {
	const { sidebarOpen, toggleSidebar } = useUIStore();
	const { user, logout } = useAuthStore();
	const [appsExpanded, setAppsExpanded] = useState(true);
	const { data: health } = useHealth();
	// Derive the active app from the current route so the shell highlights
	// the app being viewed even when the caller passes a stale value.
	let pathname = "";
	try {
		pathname = useRouterState({ select: (s) => s.location.pathname });
	} catch {
		pathname = "";
	}
	let routeActiveApp = activeApp;
	{
		const seg = pathname.split("/").filter(Boolean)[0] ?? "";
		if ((APP_NAMES as Record<string, string>)[seg]) routeActiveApp = seg;
		else if (seg === "" || seg === "dashboard") routeActiveApp = "aegis";
	}

	const appKeys = Object.keys(APP_ICONS);

	return (
		<div className="flex h-screen bg-background text-foreground overflow-hidden">
			{/* Sidebar */}
			<aside
				className={`${sidebarOpen ? "w-64" : "w-16"} flex-shrink-0 bg-background/80 border-r border-border transition-all duration-150 ease-out overflow-hidden flex flex-col`}
			>
				<div className="flex items-center justify-between h-16 px-4 border-b border-border">
					{sidebarOpen ? (
						<span className="font-heading text-xl text-foreground">Ataqu</span>
					) : (
						<span className="text-2xl font-heading text-amber">A</span>
					)}
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleSidebar}
						className="text-muted-foreground hover:text-foreground"
					>
						{sidebarOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>
				</div>

				<nav className="flex-1 py-4 overflow-y-auto">
					{/* All Apps collapsible section – only when expanded */}
					{sidebarOpen && (
						<div className="px-4 mb-2">
							<button
								onClick={() => setAppsExpanded(!appsExpanded)}
								className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								<span>All Apps</span>
								{appsExpanded ? (
									<ChevronDown className="h-4 w-4" />
								) : (
									<ChevronRight className="h-4 w-4" />
								)}
							</button>
						</div>
					)}
					{sidebarOpen &&
						appsExpanded &&
						appKeys.map((app) => {
							const iconSrc = APP_ICONS[app];
							const isActive = app === routeActiveApp;
							const to = APP_HOME[app] ?? "/";
							return (
								<Link
									key={app}
									to={to}
									className={`flex items-center px-4 py-3 transition-colors ${
										isActive
											? "bg-amber/10 text-amber border-r-2 border-amber"
											: "text-muted-foreground hover:text-foreground hover:bg-background/5"
									}`}
								>
									<img
										src={iconSrc}
										alt={APP_NAMES[app]}
										className="h-6 w-6 flex-shrink-0 object-contain"
									/>
									{sidebarOpen && (
										<span className="ml-3 text-sm font-medium">
											{APP_NAMES[app]}
										</span>
									)}
								</Link>
							);
						})}

					{/* Extra sidebar items – always shown, but only icons when collapsed */}
					{extraSidebarItems.length > 0 && (
						<>
							{sidebarOpen && <div className="border-t border-border my-2" />}
							{extraSidebarItems.map((item, idx) => (
								<a
									key={idx}
									href={item.href}
									className={`flex items-center px-4 py-3 transition-colors text-muted-foreground hover:text-foreground hover:bg-background/5 ${
										sidebarOpen ? "text-sm" : "justify-center"
									}`}
								>
									{item.icon && (
										<span className={sidebarOpen ? "mr-3" : ""}>
											{item.icon}
										</span>
									)}
									{sidebarOpen && item.label}
								</a>
							))}
						</>
					)}
				</nav>

				{/* User footer */}
				<div className="border-t border-border p-4">
					<div className="flex items-center">
						<div className="h-8 w-8 rounded-full bg-amber/20 text-amber flex items-center justify-center font-bold">
							{user?.name?.[0] || user?.email?.[0] || "U"}
						</div>
						{sidebarOpen && (
							<div className="ml-3 flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{user?.name || "User"}
								</p>
								<p className="text-xs text-muted-foreground truncate">
									{user?.email || ""}
								</p>
							</div>
						)}
					</div>
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* Header with app name - no avatar */}
				<header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50">
					<span className="font-heading text-xl text-foreground">
						{APP_NAMES[routeActiveApp] || "Ataqu"}
					</span>
					<div className="flex items-center gap-4">
						<SetupProgressWidget />
						{health && (
							<div
								title={`System health: ${health.status}${
									health.components
										? ` (outbox: ${health.components.outbox.status}, DLQ: ${health.components.spark_workflows.dlq_depth}, db pool: ${health.components.db_connection_pools.used}/${health.components.db_connection_pools.max})`
										: ""
								}`}
								className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
									health.status === "Nominal"
										? "bg-success/15 text-success"
										: health.status === "Degraded"
											? "bg-amber/15 text-amber"
											: "bg-destructive/15 text-destructive"
								}`}
							>
								<span
									className={`h-2 w-2 rounded-full ${
										health.status === "Nominal"
											? "bg-success"
											: health.status === "Degraded"
												? "bg-amber"
												: "bg-destructive"
									}`}
								/>
								{health.status}
							</div>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								document.dispatchEvent(
									new KeyboardEvent("keydown", { key: "k", metaKey: true }),
								)
							}
							className="text-muted-foreground hover:text-foreground text-sm hidden sm:flex items-center gap-2"
						>
							<span>⌘K</span>
							<span className="text-xs border border-border rounded px-1">
								Search
							</span>
						</Button>
						<div className="h-8 w-px bg-border hidden sm:block" />
						<InboxBell />
						<ChangelogBell />
						<ThemeToggle />
						<div className="h-8 w-px bg-border hidden sm:block" />
						<UserMenu />
					</div>
				</header>

				{/* Page content */}
				<div className="flex-1 overflow-auto p-6">
					<CommandRegistryProvider>
						<CommandPalette searchFn={searchFn} />
						{children}
					</CommandRegistryProvider>
				</div>
			</main>
		</div>
	);
};
