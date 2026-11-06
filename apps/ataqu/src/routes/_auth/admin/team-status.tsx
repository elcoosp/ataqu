// apps/aegis/src/routes/_auth/admin/team-status.tsx

import { useTeamStatus } from "@ataqu/api-client";
import { formatDateTime } from "@ataqu/shared-utils";
import {
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/team-status")({
	component: TeamStatusPage,
});

function TeamStatusPage() {
	const { data, isLoading, error } = useTeamStatus();

	if (isLoading) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				<Trans>Loading team activation…</Trans>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 text-sm text-destructive">
				<Trans>Failed to load team status.</Trans>
			</div>
		);
	}

	const users = data?.users ?? [];
	// tenant_progress is 0..1 in the contract, but some seeds already store a
	// percentage — accept both and clamp to a sane 0..100 display.
	const rawProgress = data?.tenant_progress ?? 0;
	const rate = Math.round(
		Math.min(100, rawProgress <= 1 ? rawProgress * 100 : rawProgress),
	);

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="meta text-muted-foreground">Aegis · SHT 01</p>
					<h1 className="font-heading mt-1.5 text-2xl leading-tight">
						<Trans>Team activation</Trans>
					</h1>
				</div>
				<div className="plate px-4 py-3 text-right">
					<p className="meta text-muted-foreground">
						<Trans>Activation rate</Trans>
					</p>
					<p className="tnum mt-1 text-2xl font-semibold text-success">
						{rate}%
					</p>
				</div>
			</div>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Trans>Name</Trans>
								</TableHead>
								<TableHead>
									<Trans>Email</Trans>
								</TableHead>
								<TableHead>
									<Trans>Role</Trans>
								</TableHead>
								<TableHead>
									<Trans>Status</Trans>
								</TableHead>
								<TableHead>
									<Trans>Last login</Trans>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((u) => (
								<TableRow key={u.user_id}>
									<TableCell className="text-foreground">
										{u.name ?? "—"}
									</TableCell>
									<TableCell className="text-secondary-foreground">
										{u.email}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{u.role}
									</TableCell>
									<TableCell>
										{u.is_active ? (
											<span className="rounded bg-success/15 px-2 py-0.5 text-xs text-success">
												<Trans>Active</Trans>
											</span>
										) : (
											<span className="rounded bg-amber/15 px-2 py-0.5 text-xs text-amber">
												<Trans>Pending</Trans>
											</span>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
