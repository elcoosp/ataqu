import { useChangelog, useMarkChangelogRead } from "@ataqu/api-client";
import { useChangelogStore } from "@ataqu/shared-stores";
import { Trans } from "@lingui/react/macro";
import { Bell } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const CATEGORY_STYLES: Record<string, string> = {
	New: "bg-success/15 text-success",
	Improved: "bg-amber/15 text-amber",
	Fixed: "bg-info/15 text-info",
};

/**
 * In-app changelog bell (spec 2.12). Shows a red dot for unread entries;
 * clicking opens a modal listing recent features/improvements/fixes fetched
 * from the backend (`GET /api/v1/changelog`).
 */
export function ChangelogBell() {
	const [open, setOpen] = useState(false);
	const { data, isLoading } = useChangelog();
	const markRead = useMarkChangelogRead();
	const lastSeenId = useChangelogStore((s) => s.lastSeenId);
	const markSeen = useChangelogStore((s) => s.markSeen);

	const entries = data ?? [];
	const latestId = entries[0]?.id ?? null;
	const showDot = latestId !== null && latestId !== lastSeenId;

	// Radix calls this on open AND close; marking seen is idempotent, so
	// handling both keeps the dot state correct even on a focus-only dismissal.
	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) return;
		// Record that the user has viewed up to the newest entry.
		markSeen(latestId);
		if (entries.length > 0) {
			markRead.mutate();
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="text-muted-foreground hover:text-white transition-colors"
					aria-label="Changelog"
				>
					<Bell className="h-5 w-5" />
					{showDot && (
						<span className="relative flex h-5 w-5">
							<span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-destructive" />
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="end"
				className="w-80 rounded-lg border-border/60 bg-deep-night/95 p-3 shadow-xl backdrop-blur ataqu-glass"
			>
				<p className="mb-2 text-sm font-medium text-white">
					<Trans>What's new</Trans>
				</p>
				{isLoading && (
					<p className="text-xs text-muted-foreground">
						<Trans>Loading…</Trans>
					</p>
				)}
				<ul className="space-y-3">
					{entries.map((entry) => (
						<li
							key={entry.id}
							className="border-b border-white/5 pb-2 last:border-0"
						>
							<div className="flex items-center gap-2">
								<span
									className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
										CATEGORY_STYLES[entry.category] ?? ""
									}`}
								>
									{entry.category}
								</span>
								<span className="text-xs text-muted-foreground">
									{entry.date}
								</span>
								{entry.breaking_change && (
									<span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-destructive">
										<Trans>Breaking</Trans>
									</span>
								)}
							</div>
							<p className="mt-1 text-sm text-white">{entry.title}</p>
							<p className="text-xs text-muted-foreground">
								{entry.description}
							</p>
						</li>
					))}
					{!isLoading && entries.length === 0 && (
						<li className="text-xs text-muted-foreground">
							<Trans>No updates yet.</Trans>
						</li>
					)}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
