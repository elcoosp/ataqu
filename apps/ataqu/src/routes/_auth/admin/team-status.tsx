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
	const rate = Math.round((data?.tenant_progress ?? 0) * 100);

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-semibold text-white">
					<Trans>Team activation</Trans>
				</h1>
				<Card className="w-48">
					<CardContent className="p-3">
						<p className="text-xs uppercase text-muted-foreground">
							<Trans>Activation rate</Trans>
						</p>
						<p className="text-2xl font-semibold text-success">{rate}%</p>
					</CardContent>
				</Card>
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
									<TableCell className="text-white">{u.name ?? "—"}</TableCell>
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
