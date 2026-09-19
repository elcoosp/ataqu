import type { InboxItem } from "@ataqu/api-client";
import { useInbox } from "@ataqu/api-client";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";

const SEVERITY_STYLES: Record<string, string> = {
	critical: "bg-destructive/15 text-destructive",
	warning: "bg-amber/15 text-amber",
	info: "bg-info/15 text-info",
};

function itemLabel(item: InboxItem): string {
	switch (item.app) {
		case "vault":
			return "Vault";
		case "spark":
			return "Spark";
		case "pause":
			return "Pause";
		case "dial":
			return "Dial";
		case "sond":
			return "Sond";
		case "tempo":
			return "Tempo";
		case "cinq":
			return "Cinq";
		default:
			return item.app;
	}
}

/**
 * Cross-app activity inbox bell (brainstorm §5.5 F1). Polls the unified
 * `GET /api/v1/inbox` feed every 30s and shows a red dot when there are
 * critical/warning signals. Items deep-link straight to the owning record
 * via the router (Enter key = click). The server ranks the feed (most
 * urgent first), so the client renders it as-is.
 */
export function InboxBell() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	// The hook only polls while mounted; mount-on-open would delay the dot,
	// so we accept the 30s poll running app-wide (a single cheap request).
	const { data, isLoading } = useInbox(30);

	const items = data ?? [];
	const needsAttention = items.some(
		(i) => i.severity === "critical" || i.severity === "warning",
	);

	const openItem = (item: InboxItem) => {
		setOpen(false);
		navigate({ to: item.deep_link as never });
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="text-muted-foreground hover:text-white transition-colors"
				aria-label="Inbox"
			>
				<Bell className="h-5 w-5" />
				{needsAttention && (
					<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
				)}
			</button>

			{open && (
				<div className="absolute right-0 z-50 mt-2 w-96 rounded-lg border border-border/60 bg-deep-night/95 p-3 shadow-xl backdrop-blur ataqu-glass">
					<div className="mb-2 flex items-center justify-between">
						<p className="text-sm font-medium text-white">
							<Trans>Inbox</Trans>
						</p>
						<p className="text-[10px] text-muted-foreground">
							<Trans>Auto-refreshes every 30s</Trans>
						</p>
					</div>
					{isLoading && (
						<p className="text-xs text-muted-foreground">
							<Trans>Loading…</Trans>
						</p>
					)}
					<ul className="max-h-96 space-y-2 overflow-y-auto">
						{items.map((item) => (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => openItem(item)}
									className="w-full rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
								>
									<div className="flex items-center gap-2">
										<span
											className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
												SEVERITY_STYLES[item.severity] ?? ""
											}`}
										>
											{item.severity}
										</span>
										<span className="text-[10px] font-medium uppercase text-muted-foreground">
											{itemLabel(item)}
										</span>
										<span className="ml-auto text-[10px] text-muted-foreground">
											{new Date(item.created_at).toLocaleTimeString()}
										</span>
									</div>
									<p className="mt-1 text-sm text-white">{item.title}</p>
									{item.subtitle && (
										<p className="text-xs text-muted-foreground">
											{item.subtitle}
										</p>
									)}
								</button>
							</li>
						))}
						{!isLoading && items.length === 0 && (
							<li className="text-xs text-muted-foreground">
								<Trans>You're all caught up.</Trans>
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}
