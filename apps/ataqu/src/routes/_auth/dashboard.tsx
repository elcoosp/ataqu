// apps/aegis/src/routes/_auth/dashboard.tsx

import { api } from "@ataqu/api-client";
import {
	APP_KEYS,
	APP_LEGEND,
	APP_NAMES,
	APP_SHEET_NO,
	AppGlyph,
	Bone,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_auth/dashboard")({
	component: () => {
		const {
			data: tenant,
			isLoading,
			error,
		} = useQuery({
			queryKey: ["aegis", "tenant"],
			queryFn: () =>
				api.get<{
					id: string;
					name: string;
					plan: string;
					userCount: number;
					apiKeyCount: number;
				}>("/aegis/tenant"),
		});

		if (isLoading) {
			return (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3, 4].map((i) => (
						<Bone
							key={i}
							loading
							name="dashboard-1"
							fallback={<div className="h-32 w-full" />}
						>
							{null}
						</Bone>
					))}
				</div>
			);
		}

		if (error) {
			return <div>Error loading tenant info.</div>;
		}

		if (!tenant) return null;

		return (
			<div>
				{/* Title block */}
				<div className="flex items-end justify-between gap-4 border-b border-border pb-5">
					<div className="min-w-0">
						<p className="meta text-muted-foreground">
							Aegis · Control sheet · SHT 01
						</p>
						<h1 className="font-heading mt-2 text-3xl leading-tight">
							<Trans>Dashboard</Trans>
						</h1>
					</div>
					<div className="hidden sm:flex items-center gap-2 border border-border bg-card px-3 py-1.5">
						<span className="meta text-muted-foreground">Plan</span>
						<span className="meta text-foreground">{tenant.plan}</span>
					</div>
				</div>

				{/* Figures */}
				<div className="mt-6 grid gap-4 sm:grid-cols-3">
					<div className="plate p-5">
						<p className="meta text-muted-foreground">Tenant</p>
						<p className="font-heading mt-3 truncate text-xl leading-tight">
							{tenant.name}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Workspace of record
						</p>
					</div>
					<div className="plate p-5">
						<p className="meta text-muted-foreground">Users</p>
						<p className="font-heading tnum mt-3 text-4xl leading-none">
							{tenant.userCount}
						</p>
						<p className="mt-2 text-xs text-muted-foreground">
							Active workspace members
						</p>
					</div>
					<div className="plate p-5">
						<p className="meta text-muted-foreground">API keys</p>
						<p className="font-heading tnum mt-3 text-4xl leading-none">
							{tenant.apiKeyCount}
						</p>
						<p className="mt-2 text-xs text-muted-foreground">
							Issued credentials
						</p>
					</div>
				</div>

				{/* The set — every app is a numbered sheet */}
				<div className="mt-8 border border-border bg-card">
					<div className="flex items-center justify-between border-b border-border px-5 py-3">
						<span className="meta text-muted-foreground">
							The set · {APP_KEYS.length} sheets
						</span>
						<span className="meta hidden text-muted-foreground/60 sm:inline">
							Rev {new Date().getFullYear()}
						</span>
					</div>
					{/* 1px gaps over a hairline field = perfect drafting rules */}
					<div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
						{APP_KEYS.map((app) => (
							<Link
								key={app}
								to={
									{
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
									}[app] ?? "/dashboard"
								}
								className="group flex flex-col gap-3 bg-card p-5 transition-colors hover:bg-accent"
							>
								<div className="flex items-center justify-between">
									<span className="text-foreground/80">
										<AppGlyph app={app} className="h-5 w-5" />
									</span>
									<span className="meta text-[10px] text-muted-foreground/60 group-hover:text-primary">
										SHT {APP_SHEET_NO[app]}
									</span>
								</div>
								<div>
									<p className="text-sm font-semibold tracking-wide">
										{APP_NAMES[app]}
									</p>
									<p className="mt-0.5 text-xs leading-snug text-muted-foreground">
										{APP_LEGEND[app]}
									</p>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Related admin sheets */}
				<div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5">
					<span className="meta text-muted-foreground">Related</span>
					{[
						{ label: "Users", to: "/users" },
						{ label: "Roles", to: "/roles" },
						{ label: "API keys", to: "/api-keys" },
						{ label: "Access matrix", to: "/admin/access-matrix" },
						{ label: "Audit log", to: "/admin/audit" },
					].map((l) => (
						<Link
							key={l.to}
							to={l.to}
							className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
						>
							{l.label}
							<ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
						</Link>
					))}
				</div>
			</div>
		);
	},
});
