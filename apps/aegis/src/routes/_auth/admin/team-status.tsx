// apps/aegis/src/routes/_auth/admin/team-status.tsx

import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ataqu/ui";
import { useTeamStatus } from "@ataqu/api-client";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/team-status")({
	component: TeamStatusPage,
});

function TeamStatusPage() {
	const { data, isLoading, error } = useTeamStatus();

	if (isLoading) {
		return (
			<div className="p-6 text-sm text-gray-400">
				<Trans>Loading team activation…</Trans>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 text-sm text-red-400">
				<Trans>Failed to load team status.</Trans>
			</div>
		);
	}

	const members = data?.members ?? [];
	const rate = Math.round((data?.activation_rate ?? 0) * 100);

	return (
		<div className="space-y-4 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-semibold text-white">
					<Trans>Team activation</Trans>
				</h1>
				<Card className="w-48">
					<CardContent className="p-3">
						<p className="text-xs uppercase text-gray-500">
							<Trans>Activation rate</Trans>
						</p>
						<p className="text-2xl font-semibold text-emerald-400">{rate}%</p>
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
									<Trans>Status</Trans>
								</TableHead>
								<TableHead>
									<Trans>Last active</Trans>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((m) => (
								<TableRow key={m.user_id}>
									<TableCell className="text-white">{m.full_name}</TableCell>
									<TableCell className="text-gray-300">{m.email}</TableCell>
									<TableCell>
										{m.activated ? (
											<span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
												<Trans>Active</Trans>
											</span>
										) : (
											<span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
												<Trans>Pending</Trans>
											</span>
										)}
									</TableCell>
									<TableCell className="text-gray-400">
										{m.last_active_at
											? new Date(m.last_active_at).toLocaleString()
											: "—"}
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
