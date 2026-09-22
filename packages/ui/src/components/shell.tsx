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

/**
 * Per-app sub-navigation (brainstorm P3-7, "sidebar: per-app sub-nav slots").
 *
 * The shell only ever listed the 10 apps: every second-level surface (dial
 * tickets, tempo availability/calendar, vault movements/reservations, vista
 * explore/health, aegis admin pages…) was reachable *only* by typing the URL
 * or through ⌘K. These slots fix that with the routes that actually exist.
 */
export const APP_SUB_NAV: Record<string, SidebarItem[]> = {
	aegis: [
		{ label: "Dashboard", href: "/dashboard" },
		{ label: "Users", href: "/users" },
		{ label: "Roles", href: "/roles" },
		{ label: "API keys", href: "/api-keys" },
		{ label: "Audit log", href: "/admin/audit" },
		{ label: "Access matrix", href: "/admin/access-matrix" },
		{ label: "Approvals", href: "/admin/approvals" },
		{ label: "Team status", href: "/admin/team-status" },
		{ label: "Migration", href: "/admin/migration" },
		{ label: "Settings", href: "/settings" },
	],
	cinq: [
		{ label: "Dashboard", href: "/cinq/dashboard" },
		{ label: "Contacts", href: "/cinq/contacts" },
		{ label: "Deals", href: "/cinq/deals" },
		{ label: "Tasks", href: "/cinq/tasks" },
		{ label: "Establishments", href: "/cinq/establishments" },
		{ label: "Import", href: "/cinq/import" },
	],
	dial: [
		{ label: "Channels", href: "/dial" },
		{ label: "Tickets", href: "/dial/tickets" },
		{ label: "Dashboard", href: "/dial/dashboard" },
	],
	pause: [
		{ label: "Dashboard", href: "/pause/dashboard" },
		{ label: "Directory", href: "/pause/directory" },
		{ label: "Leave", href: "/pause/leave" },
		{ label: "Onboarding", href: "/pause/onboarding" },
		{ label: "Reports", href: "/pause/reports" },
	],
	pivot: [
		{ label: "Documents", href: "/pivot" },
		{ label: "Databases", href: "/pivot/db" },
		{ label: "Templates", href: "/pivot/templates" },
		{ label: "Dashboard", href: "/pivot/dashboard" },
	],
	sond: [
		{ label: "Forms", href: "/sond" },
		{ label: "Dashboard", href: "/sond/dashboard" },
	],
	spark: [
		{ label: "Workflows", href: "/spark" },
		{ label: "Runs", href: "/spark/runs" },
		{ label: "DLQ", href: "/spark/dlq" },
		{ label: "Dashboard", href: "/spark/dashboard" },
	],
	tempo: [
		{ label: "Dashboard", href: "/tempo/dashboard" },
		{ label: "Availability", href: "/tempo/availability" },
		{ label: "Calendar", href: "/tempo/calendar-settings" },
	],
	vault: [
		{ label: "Products", href: "/vault/products" },
		{ label: "Movements", href: "/vault/movements" },
		{ label: "Reservations", href: "/vault/reservations" },
		{ label: "Warehouses", href: "/vault/warehouses" },
		{ label: "Dashboard", href: "/vault/dashboard" },
	],
	vista: [
		{ label: "Dashboards", href: "/vista" },
		{ label: "Explore", href: "/vista/explore" },
		{ label: "Health", href: "/vista/health" },
		{ label: "Dashboard", href: "/vista/dashboard" },
	],
};

/**
 * Longest-matching sub-nav href for the current path, so `/dial/tickets/42`
 * highlights "Tickets" rather than the broader `/dial` entry.
 */
export function activeSubNavHref(
	items: SidebarItem[],
	pathname: string,
): string | undefined {
	let best: string | undefined;
	for (const item of items) {
		const matches =
			pathname === item.href || pathname.startsWith(`${item.href}/`);
		if (matches && (best === undefined || item.href.length > best.length)) {
			best = item.href;
		}
	}
	return best;
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

	// Per-app sub-nav for the app in view (P3-7). Collapsed sidebar keeps the
	// divider only, so the icon rail stays uncluttered.
	const subNav = APP_SUB_NAV[routeActiveApp] ?? [];
	const subNavActive = activeSubNavHref(subNav, pathname);

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

					{/* Per-app sub-navigation for the app currently in view (P3-7). */}
				{subNav.length > 0 && subNavActive && (
					<>
						{sidebarOpen ? (
							<div className="mt-2 border-t border-border pt-2">
								<div className="px-4 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
									{APP_NAMES[routeActiveApp] ?? routeActiveApp}
								</div>
								{subNav.map((item) => {
									const isActive = item.href === subNavActive;
									return (
										<Link
											key={item.href}
											to={item.href}
											className={`block px-4 py-2 text-sm transition-colors ${
												isActive
													? "text-amber border-r-2 border-amber"
													: "text-muted-foreground hover:text-foreground hover:bg-background/5"
											}`}
											data-sub-nav={item.href}
											aria-current={isActive ? "page" : undefined}
										>
											{item.label}
										</Link>
									);
								})}
							</div>
						) : (
							<div className="mt-2 border-t border-border pt-2" />
						)}
					</>
				)}

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
