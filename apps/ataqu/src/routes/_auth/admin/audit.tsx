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
import { useMemo } from "react";
import { searchSchema, stringSearch, useUrlState } from "@ataqu/shared-hooks";
import { intSearch } from "@ataqu/shared-hooks";

export const Route = createFileRoute("/_auth/admin/audit")({
	validateSearch: searchSchema({
		action: stringSearch(""),
		app: stringSearch(""),
		from_date: stringSearch(""),
		to_date: stringSearch(""),
		offset: intSearch(0, 0),
	}),
	component: () => {
		const _queryClient = useQueryClient();
		const search = Route.useSearch();
		const navigate = Route.useNavigate();

		const [action, setAction] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "action",
			default: "",
			parse: stringSearch(""),
			serialize: (v) => (v === "" ? undefined : v),
		});
		const [app, setApp] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "app",
			default: "",
			parse: stringSearch(""),
			serialize: (v) => (v === "" ? undefined : v),
		});
		const [fromDate, setFromDate] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "from_date",
			default: "",
			parse: stringSearch(""),
			serialize: (v) => (v === "" ? undefined : v),
		});
		const [toDate, setToDate] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "to_date",
			default: "",
			parse: stringSearch(""),
			serialize: (v) => (v === "" ? undefined : v),
		});
		const [offset, setOffset] = useUrlState({
			search,
			setSearch: (next) => navigate({ search: next as never }),
			key: "offset",
			default: 0,
			parse: intSearch(0, 0),
			serialize: (v) => (v === 0 ? undefined : String(v)),
		});

		const limit = 50;
		const filters = useMemo(
			() => ({ action, app, from_date: fromDate, to_date: toDate }),
			[action, app, fromDate, toDate],
		);

		const {
			data: logs,
			isLoading,
			error,
			refetch,
		} = useGetAuditLog({
			action: action || undefined,
			app: app || undefined,
			from_date: fromDate || undefined,
			to_date: toDate || undefined,
			limit,
			offset,
		});

		const handleExport = () => {
			// Export CSV
			const params = new URLSearchParams();
			if (action) params.append("action", action);
			if (app) params.append("app", app);
			if (fromDate) params.append("from_date", fromDate);
			if (toDate) params.append("to_date", toDate);
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
							value={action || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setAction(e.target.value)
							}
							className="w-40"
						/>
					</div>
					<div>
						<label className="block text-xs text-muted-foreground">App</label>
						<Select
							value={app || ""}
							onValueChange={(val) =>
								setApp(val === "" ? "" : val)
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
							value={fromDate || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setFromDate(e.target.value)
							}
							className="w-36"
						/>
					</div>
					<div>
						<label className="block text-xs text-muted-foreground">To</label>
						<Input
							type="date"
							value={toDate || ""}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setToDate(e.target.value)
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
