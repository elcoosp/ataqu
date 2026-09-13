// apps/aegis/src/routes/_auth/admin/audit.tsx

import { useGetAuditLog } from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_auth/admin/audit")({
	component: () => {
		const _queryClient = useQueryClient();
		const [filters, setFilters] = useState<{
			action?: string;
			app?: string;
			from_date?: string;
			to_date?: string;
		}>({});
		const [limit, _setLimit] = useState(50);
		const [offset, setOffset] = useState(0);

		const {
			data: logs,
			isLoading,
			error,
			refetch,
		} = useGetAuditLog({
			action: filters.action || undefined,
			app: filters.app || undefined,
			from_date: filters.from_date || undefined,
			to_date: filters.to_date || undefined,
			limit,
			offset,
		});

		const handleExport = () => {
			// Export CSV
			const params = new URLSearchParams();
			if (filters.action) params.append("action", filters.action);
			if (filters.app) params.append("app", filters.app);
			if (filters.from_date) params.append("from_date", filters.from_date);
			if (filters.to_date) params.append("to_date", filters.to_date);
			const qs = params.toString();
			window.open(
				`/api/v1/aegis/audit-log/export${qs ? `?${qs}` : ""}`,
				"_blank",
			);
		};

		if (isLoading) {
			return (
				<div className="p-6">
					<Bone
						loading
						name="audit-loading"
						fallback={
							<>
								<Bone
									loading
									name="audit-1"
									fallback={<div className="h-10 w-48 mb-4" />}
								>
									{null}
								</Bone>
								<Bone
									loading
									name="audit-2"
									fallback={<div className="h-96 w-full" />}
								>
									{null}
								</Bone>
							</>
						}
					>
						<div />
					</Bone>
				</div>
			);
		}

		if (error) {
			return <div>Error loading audit log.</div>;
		}

		const auditLogs = logs || [];

		return (
			<div className="p-6">
				<h1 className="text-2xl font-heading mb-4">
					<Trans>Audit Log</Trans>
				</h1>

				<div className="flex flex-wrap gap-2 mb-4 items-end">
					<div>
						<label className="block text-xs text-muted-foreground">
							Action
						</label>
						<Input
							placeholder="e.g., login"
							value={filters.action || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setFilters({ ...filters, action: e.target.value })
							}
							className="w-40"
						/>
					</div>
					<div>
						<label className="block text-xs text-muted-foreground">App</label>
						<Select
							value={filters.app || ""}
							onValueChange={(val) =>
								setFilters({ ...filters, app: val === "" ? undefined : val })
							}
						>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="All" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All</SelectItem>
								<SelectItem value="aegis">AEGIS</SelectItem>
								<SelectItem value="cinq">CINQ</SelectItem>
								<SelectItem value="dial">DIAL</SelectItem>
								<SelectItem value="pause">PAUSE</SelectItem>
								<SelectItem value="pivot">PIVOT</SelectItem>
								<SelectItem value="sond">SOND</SelectItem>
								<SelectItem value="spark">SPARK</SelectItem>
								<SelectItem value="tempo">TEMPO</SelectItem>
								<SelectItem value="vault">VAULT</SelectItem>
								<SelectItem value="vista">VISTA</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="block text-xs text-muted-foreground">From</label>
						<Input
							type="date"
							value={filters.from_date || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setFilters({ ...filters, from_date: e.target.value })
							}
							className="w-36"
						/>
					</div>
					<div>
						<label className="block text-xs text-muted-foreground">To</label>
						<Input
							type="date"
							value={filters.to_date || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setFilters({ ...filters, to_date: e.target.value })
							}
							className="w-36"
						/>
					</div>
					<Button onClick={() => refetch()} size="sm">
						<Search className="h-4 w-4 mr-1" /> Filter
					</Button>
					<Button onClick={handleExport} size="sm" variant="outline">
						<Download className="h-4 w-4 mr-1" /> Export CSV
					</Button>
				</div>

				<Card>
					<CardContent className="p-0 overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										<Trans>User</Trans>
									</TableHead>
									<TableHead>
										<Trans>Action</Trans>
									</TableHead>
									<TableHead>
										<Trans>App</Trans>
									</TableHead>
									<TableHead>
										<Trans>Timestamp</Trans>
									</TableHead>
									<TableHead>
										<Trans>IP</Trans>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{auditLogs.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center text-muted-foreground"
										>
											No audit logs found.
										</TableCell>
									</TableRow>
								) : (
									auditLogs.map((log) => (
										<TableRow key={log.id}>
											<TableCell>{log.user_id}</TableCell>
											<TableCell>{log.action}</TableCell>
											<TableCell>{log.app}</TableCell>
											<TableCell>
												{new Date(log.created_at).toLocaleString()}
											</TableCell>
											<TableCell>{log.ip_address || "—"}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<div className="flex justify-between items-center mt-4">
					<span className="text-sm text-muted-foreground">
						{auditLogs.length} entries
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setOffset(Math.max(0, offset - limit))}
							disabled={offset === 0}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setOffset(offset + limit)}
							disabled={auditLogs.length < limit}
						>
							Next
						</Button>
					</div>
				</div>
			</div>
		);
	},
});
