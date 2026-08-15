import { CHANGELOG, useChangelogStore } from "@ataqu/shared-stores";
import { Trans } from "@lingui/react/macro";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORY_STYLES: Record<string, string> = {
	New: "bg-emerald-500/15 text-emerald-400",
	Improved: "bg-amber-500/15 text-amber-400",
	Fixed: "bg-sky-500/15 text-sky-400",
};

/**
 * In-app changelog bell (spec 2.12). Shows a red dot for unread entries;
 * clicking opens a modal listing recent features/improvements/fixes.
 */
export function ChangelogBell() {
	const [open, setOpen] = useState(false);
	const lastSeenId = useChangelogStore((s) => s.lastSeenId);
	const markSeen = useChangelogStore((s) => s.markSeen);
	const _unread = useChangelogStore((s) => s.unreadCount());

	useEffect(() => {
		if (open) markSeen();
	}, [open, markSeen]);

	const showDot = lastSeenId !== CHANGELOG[0]?.id;

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="text-gray-400 hover:text-white transition-colors"
				aria-label="Changelog"
			>
				<Bell className="h-5 w-5" />
				{showDot && (
					<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
				)}
			</button>

			{open && (
				<div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-700/60 bg-deep-night/95 p-3 shadow-xl backdrop-blur ataqu-glass">
					<p className="mb-2 text-sm font-medium text-white">
						<Trans>What's new</Trans>
					</p>
					<ul className="space-y-3">
						{CHANGELOG.map((entry) => (
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
									<span className="text-xs text-gray-500">{entry.date}</span>
								</div>
								<p className="mt-1 text-sm text-white">{entry.title}</p>
								<p className="text-xs text-gray-400">{entry.description}</p>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
