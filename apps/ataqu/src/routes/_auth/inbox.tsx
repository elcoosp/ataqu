// Activity Inbox (brainstorm §5.5 F1) — one cross-app notification surface.
//
// The server fans out across every producing app (vault low stock, spark failed
// runs / pending approvals, pause pending leave, changelog) and returns a single
// ranked feed, so this page makes one request rather than one per app.
//
// Keyboard-first, like Linear's inbox: j/k move, Enter opens the source record,
// e dismisses. Dismissals are per-user and local — the server-side mark-read
// store does not exist yet, so this is deliberately labeled as local.

import {
	type InboxItem,
	type InboxSeverity,
	useInbox,
} from "@ataqu/api-client";
import { Bone, Button, Card } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISSED_KEY = "ataqu.inbox.dismissed";

function readDismissed(): string[] {
	try {
		const raw = localStorage.getItem(DISMISSED_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

const severityIcon = (severity: InboxSeverity) => {
	if (severity === "critical") return AlertTriangle;
	if (severity === "warning") return Info;
	return CheckCircle2;
};

const severityClass = (severity: InboxSeverity) =>
	severity === "critical"
		? "text-destructive"
		: severity === "warning"
			? "text-warning"
			: "text-muted-foreground";

function InboxPage() {
	const { data, isPending, error, refetch } = useInbox(50);
	const navigate = useNavigate();
	const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());
	const [cursor, setCursor] = useState(0);

	useEffect(() => {
		localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
	}, [dismissed]);

	const items = (data ?? []).filter((i) => !dismissed.includes(i.id));
	const activeItem = items[Math.min(cursor, Math.max(items.length - 1, 0))];

	const open = useCallback(
		(item: InboxItem) => {
			// deep_link is router-relative, e.g. /vault/products/<id>.
			navigate({ to: item.deep_link });
		},
		[navigate],
	);

	const dismiss = useCallback((item: InboxItem) => {
		setDismissed((prev) =>
			prev.includes(item.id) ? prev : [...prev, item.id],
		);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Never hijack typing.
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName?.toLowerCase();
			if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
				return;
			}
			if (!items.length) return;
			if (event.key === "j") {
				event.preventDefault();
				setCursor((c) => Math.min(c + 1, items.length - 1));
			} else if (event.key === "k") {
				event.preventDefault();
				setCursor((c) => Math.max(c - 1, 0));
			} else if (event.key === "Enter" && activeItem) {
				event.preventDefault();
				open(activeItem);
			} else if (event.key === "e" && activeItem) {
				event.preventDefault();
				dismiss(activeItem);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [items.length, activeItem, open, dismiss]);

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center gap-2">
				<Bell className="h-5 w-5 text-muted-foreground" />
				<h1 className="font-heading text-3xl">
					<Trans>Inbox</Trans>
				</h1>
				<span className="ml-auto text-xs text-muted-foreground">
					<Trans>j/k to move · Enter to open · e to dismiss</Trans>
				</span>
			</div>

			{isPending ? (
				<div className="space-y-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<Bone
							key={i}
							loading
							name="inbox-row"
							fallback={<div className="h-14" />}
						>
							{null}
						</Bone>
					))}
				</div>
			) : error ? (
				<Card className="p-6">
					<p className="text-sm text-muted-foreground">
						<Trans>Could not load your inbox.</Trans>
					</p>
					<Button className="mt-3" variant="outline" onClick={() => refetch()}>
						<Trans>Retry</Trans>
					</Button>
				</Card>
			) : items.length === 0 ? (
				<Card className="p-10 text-center">
					<CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						<Trans>Nothing needs your attention.</Trans>
					</p>
				</Card>
			) : (
				<ul className="divide-y divide-border rounded-md border border-border">
					{items.map((item, index) => {
						const Icon = severityIcon(item.severity);
						const isActive = activeItem?.id === item.id;
						return (
							<li key={item.id}>
								<button
									type="button"
									aria-current={isActive}
									onMouseEnter={() => setCursor(index)}
									onFocus={() => setCursor(index)}
									onClick={() => open(item)}
									className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors ${
										isActive ? "bg-accent" : "hover:bg-accent/50"
									}`}
								>
									<Icon
										className={`mt-0.5 h-4 w-4 shrink-0 ${severityClass(item.severity)}`}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium">
											{item.title}
										</span>
										{item.subtitle ? (
											<span className="block truncate text-xs text-muted-foreground">
												{item.subtitle}
											</span>
										) : null}
									</span>
									<span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
										{item.app}
									</span>
								</button>
								<div className="flex justify-end pb-1 pr-3">
									<button
										type="button"
										aria-label="Dismiss"
										className="rounded px-2 text-xs text-muted-foreground hover:text-foreground"
										onClick={() => dismiss(item)}
									>
										<Trans>Dismiss</Trans>
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export const Route = createFileRoute("/_auth/inbox")({
	component: InboxPage,
});
