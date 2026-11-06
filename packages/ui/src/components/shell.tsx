/// <reference types="vite/client" />

import { useHealth } from "@ataqu/api-client";
import { useAuthStore, useRecentStore, useUIStore } from "@ataqu/shared-stores";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronRight,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { APP_KEYS, APP_NAMES, APP_SHEET_NO, AppGlyph } from "../app-glyphs";
import { CommandRegistryProvider } from "../command-registry";
import { Button } from "./button";
import { ChangelogBell } from "./changelog-bell";
import { CommandPalette } from "./command-palette";
import { InboxBell } from "./inbox-bell";
import { SetupProgressWidget } from "./setup-progress-widget";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

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
		{ label: "Establishments", href: "/cinq/establishments" },
		{ label: "Deals", href: "/cinq/deals" },
		{ label: "Tasks", href: "/cinq/tasks" },
	],
	dial: [
		{ label: "Live desk", href: "/dial" },
		{ label: "Tickets", href: "/dial/tickets" },
	],
	pause: [
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

/** Registration mark: the drawing-set punchmark that anchors the wordmark. */
function RegistrationMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
			className={className}
		>
			<circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.25" />
			<path
				d="M8 0.5V4M8 12V15.5M0.5 8H4M12 8H15.5"
				stroke="currentColor"
				strokeWidth="1.25"
			/>
			<circle cx="8" cy="8" r="1.4" fill="currentColor" />
		</svg>
	);
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
	const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
	const { user } = useAuthStore();
	const [appsExpanded, setAppsExpanded] = useState(true);
	// Off-canvas behaviour below the md breakpoint: the sidebar becomes an
	// overlay drawer over the sheet instead of squeezing content to a sliver.
	const [isCompact, setIsCompact] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(max-width: 767px)").matches,
	);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const onChange = (e: MediaQueryListEvent) => setIsCompact(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	// First load on a phone: the persisted sidebar state is a desktop
	// preference — the drawer starts closed so the sheet leads.
	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			window.matchMedia("(max-width: 767px)").matches &&
			useUIStore.getState().sidebarOpen
		) {
			setSidebarOpen(false);
		}
	}, [setSidebarOpen]);
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

	const appKeys = APP_KEYS;

	// Recents in the app switcher (brainstorm F2). Derived from the palette's
	// persisted recent store so the sidebar and ⌘K share one memory: take the
	// most recent distinct apps (command entries carry the id prefix instead
	// of an app key) and drop the app already in view.
	const recents = useRecentStore((s) => s.recents);
	const recentApps: string[] = [];
	for (const entry of recents) {
		const owner = APP_NAMES[entry.app]
			? entry.app
			: appKeys.find((app) => entry.intent.startsWith(`${app}-`));
		if (!owner || owner === routeActiveApp || recentApps.includes(owner))
			continue;
		recentApps.push(owner);
		if (recentApps.length === 4) break;
	}

	// Per-app sub-nav for the app in view (P3-7). Collapsed sidebar keeps the
	// divider only, so the icon rail stays uncluttered.
	const subNav = APP_SUB_NAV[routeActiveApp] ?? [];
	const subNavActive = activeSubNavHref(subNav, pathname);

	const healthTone =
		health?.status === "Nominal"
			? "text-success border-success/40"
			: health?.status === "Degraded"
				? "text-warning border-warning/50"
				: "text-destructive border-destructive/50";

	return (
		<div className="relative flex h-screen bg-background text-foreground overflow-hidden">
			{/* Mobile drawer backdrop */}
			{isCompact && sidebarOpen && (
				<div
					aria-hidden="true"
					className="absolute inset-0 z-40 bg-deep-night/50 md:hidden"
					onClick={toggleSidebar}
				/>
			)}
			{/* Sidebar — the index sheet of the drawing set */}
			<aside
				className={`${
					isCompact
						? sidebarOpen
							? "absolute inset-y-0 left-0 z-50 flex w-64 shadow-lg"
							: "hidden"
						: sidebarOpen
							? "flex w-64 flex-shrink-0"
							: "flex w-14 flex-shrink-0"
				} bg-background border-r border-border transition-all duration-150 ease-out overflow-hidden flex-col`}
			>
				<div
					className={`flex items-center h-14 border-b border-border ${sidebarOpen ? "px-4 justify-between" : "justify-center"}`}
				>
					{sidebarOpen && isCompact ? (
						<>
							<Link
								to="/dashboard"
								className="flex items-center gap-2.5 min-w-0"
							>
								<RegistrationMark className="h-4 w-4 text-primary flex-shrink-0" />
								<span className="brand-mark text-sm text-foreground truncate">
									ATAQU
								</span>
							</Link>
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleSidebar}
								aria-label="Close menu"
								className="h-7 w-7 text-muted-foreground hover:text-foreground"
							>
								<PanelLeftClose className="h-4 w-4" />
							</Button>
						</>
					) : sidebarOpen ? (
						<Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
							<RegistrationMark className="h-4 w-4 text-primary flex-shrink-0" />
							<span className="brand-mark text-sm text-foreground truncate">
								ATAQU
							</span>
						</Link>
					) : (
						<Link to="/dashboard" aria-label="Ataqu" className="text-primary">
							<RegistrationMark className="h-4.5 w-4.5" />
						</Link>
					)}
					{sidebarOpen && (
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleSidebar}
							aria-label="Collapse sidebar"
							className="h-7 w-7 text-muted-foreground hover:text-foreground"
						>
							<PanelLeftClose className="h-4 w-4" />
						</Button>
					)}
				</div>
				{!sidebarOpen && (
					<div className="flex justify-center py-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleSidebar}
							aria-label="Expand sidebar"
							className="h-7 w-7 text-muted-foreground hover:text-foreground"
						>
							<PanelLeftOpen className="h-4 w-4" />
						</Button>
					</div>
				)}

				<nav
					className="flex-1 py-3 overflow-y-auto"
					onClick={() => {
						// Navigating from the phone drawer dismisses it.
						if (isCompact && sidebarOpen) setSidebarOpen(false);
					}}
				>
					{/* Recent apps (F2) — fastest path back to what you were doing. */}
					{sidebarOpen && recentApps.length > 0 && (
						<div className="mb-3">
							<div className="px-4 pb-1.5 meta text-muted-foreground/80">
								Recent
							</div>
							{recentApps.map((app) => (
								<Link
									key={app}
									to={APP_HOME[app] ?? "/"}
									className="flex items-center px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
									data-recent-app={app}
								>
									<AppGlyph app={app} className="h-4 w-4 flex-shrink-0" />
									<span className="ml-2.5">{APP_NAMES[app]}</span>
								</Link>
							))}
							<div className="mx-4 mt-3 border-t border-border" />
						</div>
					)}

					{/* All Apps collapsible section – only when expanded */}
					{sidebarOpen && (
						<div className="px-4 mb-1.5">
							<button
								onClick={() => setAppsExpanded(!appsExpanded)}
								className="flex items-center justify-between w-full text-left meta text-muted-foreground/80 hover:text-foreground transition-colors"
							>
								<span>Sheet index</span>
								{appsExpanded ? (
									<ChevronDown className="h-3.5 w-3.5" />
								) : (
									<ChevronRight className="h-3.5 w-3.5" />
								)}
							</button>
						</div>
					)}
					{sidebarOpen &&
						appsExpanded &&
						appKeys.map((app) => {
							const isActive = app === routeActiveApp;
							const to = APP_HOME[app] ?? "/";
							return (
								<Link
									key={app}
									to={to}
									className={`relative flex items-center px-4 py-2 transition-colors ${
										isActive
											? "bg-card text-foreground"
											: "text-muted-foreground hover:text-foreground hover:bg-accent"
									}`}
								>
									{isActive && (
										<span
											aria-hidden="true"
											className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
											data-active-rule
										/>
									)}
									<span
										className={`flex-shrink-0 ${isActive ? "text-primary" : ""}`}
									>
										<AppGlyph app={app} className="h-4 w-4" />
									</span>
									<span className="ml-2.5 text-sm font-medium tracking-wide">
										{APP_NAMES[app]}
									</span>
									<span
										className={`ml-auto meta text-[10px] ${isActive ? "text-primary/80" : "text-muted-foreground/60"}`}
									>
										{APP_SHEET_NO[app]}
									</span>
								</Link>
							);
						})}

					{/* Per-app sub-navigation for the app currently in view (P3-7). */}
					{subNav.length > 0 &&
						subNavActive &&
						(sidebarOpen ? (
							<div className="mt-3 border-t border-border pt-3">
								<div className="px-4 pb-1.5 meta text-muted-foreground/80">
									{APP_NAMES[routeActiveApp] ?? routeActiveApp} · SHT{" "}
									{APP_SHEET_NO[routeActiveApp]}
								</div>
								{subNav.map((item) => {
									const isActive = item.href === subNavActive;
									return (
										<Link
											key={item.href}
											to={item.href}
											className={`relative block px-4 py-1.5 text-sm transition-colors ${
												isActive
													? "text-primary font-medium"
													: "text-muted-foreground hover:text-foreground hover:bg-accent"
											}`}
											data-sub-nav={item.href}
											aria-current={isActive ? "page" : undefined}
										>
											{isActive && (
												<span
													aria-hidden="true"
													className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary"
												/>
											)}
											{item.label}
										</Link>
									);
								})}
							</div>
						) : (
							<div className="mt-3 border-t border-border pt-3" />
						))}

					{/* Extra sidebar items – always shown, but only icons when collapsed */}
					{extraSidebarItems.length > 0 && (
						<>
							{sidebarOpen && <div className="border-t border-border my-3" />}
							{extraSidebarItems.map((item, idx) => (
								<a
									key={idx}
									href={item.href}
									className={`flex items-center px-4 py-2 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent ${
										sidebarOpen ? "text-sm" : "justify-center"
									}`}
								>
									{item.icon && (
										<span className={sidebarOpen ? "mr-2.5" : ""}>
											{item.icon}
										</span>
									)}
									{sidebarOpen && item.label}
								</a>
							))}
						</>
					)}
				</nav>

				{/* User footer — the drawn-by stamp */}
				<div className="border-t border-border p-3">
					<div className="flex items-center">
						<div
							className="h-8 w-8 flex-shrink-0 bg-foreground text-background flex items-center justify-center text-sm font-semibold"
							aria-hidden="true"
						>
							{user?.name?.[0] || user?.email?.[0] || "U"}
						</div>
						{sidebarOpen && (
							<div className="ml-2.5 flex-1 min-w-0">
								<p className="text-sm font-medium truncate leading-tight">
									{user?.name || "User"}
								</p>
								<p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
									{user?.email || ""}
								</p>
							</div>
						)}
					</div>
				</div>
			</aside>

			{/* Main content — title block strip above the sheet */}
			<main className="flex-1 flex flex-col overflow-hidden">
				<header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-background">
					<div className="flex items-baseline gap-3 min-w-0">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleSidebar}
							aria-label="Open menu"
							className="h-8 w-8 self-center text-muted-foreground hover:text-foreground md:hidden"
						>
							<Menu className="h-4.5 w-4.5" />
						</Button>
						<span className="font-heading text-lg text-foreground truncate">
							{APP_NAMES[routeActiveApp] || "Ataqu"}
						</span>
						<span className="meta text-muted-foreground/70 hidden sm:inline">
							SHT {APP_SHEET_NO[routeActiveApp] ?? "00"}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<SetupProgressWidget />
						{health && (
							<div
								title={`System health: ${health.status}${
									health.components
										? ` (outbox: ${health.components.outbox.status}, DLQ: ${health.components.spark_workflows.dlq_depth}, db pool: ${health.components.db_connection_pools.used}/${health.components.db_connection_pools.max})`
										: ""
								}`}
								className={`hidden md:flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium ${healthTone}`}
							>
								<span
									className={`h-1.5 w-1.5 ${
										health.status === "Nominal"
											? "bg-success"
											: health.status === "Degraded"
												? "bg-warning"
												: "bg-destructive"
									}`}
								/>
								<span className="meta text-[10px] leading-5">
									{health.status}
								</span>
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
							<span className="meta">⌘K</span>
							<span className="meta text-[10px] border border-border px-1 leading-4">
								Search
							</span>
						</Button>
						<div className="h-6 w-px bg-border hidden sm:block" />
						<InboxBell />
						<ChangelogBell />
						<ThemeToggle />
						<div className="h-6 w-px bg-border hidden sm:block" />
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
