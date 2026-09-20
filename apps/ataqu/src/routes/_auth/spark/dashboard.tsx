import { formatDateTime } from "@ataqu/shared-utils";
import {
	Badge,
	Bone,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	Play,
	Plus,
	RefreshCw,
	Terminal,
	XCircle,
} from "lucide-react";
import {
	useListWorkflowRuns,
	useListWorkflows,
} from "../../../apps/spark/api/spark-api";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/spark/dashboard")({
	component: SparkDashboard,
});

export function MetricCard({
	label,
	value,
	sub,
	icon: Icon,
	color,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ElementType;
	color?: string;
}) {
	const bg = color ?? "bg-amber/10 text-amber";
	return (
		<Card className="overflow-hidden">
			<div className="p-5">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</p>
						<p className="text-2xl font-bold text-white mt-1">{value}</p>
						{sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
					</div>
					<div className={`rounded-full p-2.5 ${bg}`}>
						<Icon className="h-4 w-4" />
					</div>
				</div>
			</div>
		</Card>
	);
}

function WorkflowRow({
	w,
}: {
	w: { id: string; name: string; is_active: boolean };
}) {
	return (
		<Link
			to="/spark/workflows/$id"
			params={{ id: w.id }}
			search={{ testOpen: false }}
			className="block"
		>
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-semibold text-white">{w.name}</h4>
							<p className="text-xs text-muted-foreground mt-0.5">
								{w.is_active ? "active" : "paused"}
							</p>
						</div>
						<Badge
							variant={w.is_active ? "secondary" : "outline"}
							className="text-xs"
						>
							{w.is_active ? "live" : "off"}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function RunRow({
	r,
}: {
	r: { id: string; status: string; created_at: string };
}) {
	const s =
		r.status === "completed"
			? "bg-success/15 text-success"
			: r.status === "failed"
				? "bg-destructive/15 text-destructive"
				: "bg-amber/15 text-amber";
	const I =
		r.status === "completed"
			? CheckCircle
			: r.status === "failed"
				? XCircle
				: RefreshCw;
	const bg2 = `text-xs px-1.5 py-0.5 rounded-full ${s}`;
	return (
		<div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
			<div className="flex items-center gap-3">
				<div
					className={`w-8 h-8 rounded-full flex items-center justify-center ${s}`}
				>
					<I className="h-3.5 w-3.5" />
				</div>
				<div>
					<p className="text-sm text-white">Run #{r.id.slice(0, 8)}</p>
					<p className="text-xs text-muted-foreground">
						{formatDateTime(r.created_at)}
					</p>
				</div>
			</div>
			<span className={bg2}>{r.status}</span>
		</div>
	);
}

function EmptyBox({
	title,
	desc,
	icon: Icon,
	action,
	onClick,
}: {
	title: string;
	desc: string;
	icon: React.ElementType;
	action?: string;
	onClick?: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-10 text-center">
			<div className="mb-3 rounded-full bg-muted p-3">
				<Icon className="h-5 w-5 text-muted-foreground" />
			</div>
			<p className="text-sm font-medium text-white">{title}</p>
			<p className="text-xs text-muted-foreground mt-1 max-w-xs">{desc}</p>
			{action && onClick && (
				<Button className="mt-4" size="sm" onClick={onClick}>
					{action}
				</Button>
			)}
		</div>
	);
}
function SparkDashboard() {
	const { data: wfData, isLoading: wfL } = useListWorkflows({ limit: 5 });
	const { data: runData, isLoading: rL } = useListWorkflowRuns({ limit: 5 });
	const wfs = wfData?.items ?? [];
	const runs = runData?.items ?? [];
	const activeWfs = wfs.filter((w) => w.is_active).length;
	const failedRuns = runs.filter((r) => r.status === "failed").length;
	const okRate =
		runs.length > 0
			? Math.round(((runs.length - failedRuns) / runs.length) * 100)
			: 100;
	const col1 =
		activeWfs > 0
			? "bg-success/10 text-success"
			: "bg-muted/10 text-muted-foreground";
	const col2 =
		okRate >= 90 ? "bg-success/10 text-success" : "bg-amber/10 text-amber";
	const col3 =
		failedRuns > 0
			? "bg-destructive/10 text-destructive"
			: "bg-muted/10 text-muted-foreground";
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>Automation</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>Workflows, runs, and delivery reliability.</Trans>
					</p>
				</div>
				<div className="flex gap-2">
					<Button size="sm" asChild>
						<Link
							to="/spark/workflows/$id"
							params={{ id: "new" }}
							search={{ testOpen: false }}
						>
							<Plus className="h-3.5 w-3.5 mr-1.5" />
							<Trans>New Workflow</Trans>
						</Link>
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link to="/spark/dlq">
							<AlertCircle className="h-3.5 w-3.5 mr-1.5" />
							<Trans>DLQ</Trans>
						</Link>
					</Button>
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					label={t`Workflows`}
					value={wfs.length}
					sub={`${activeWfs} active`}
					icon={Play}
					color={col1}
				/>
				<MetricCard
					label={t`Runs Today`}
					value={runs.length}
					sub="last 24h"
					icon={Terminal}
				/>
				<MetricCard
					label={t`Success Rate`}
					value={`${okRate}%`}
					sub="last 24h"
					icon={CheckCircle}
					color={col2}
				/>
				<MetricCard
					label={t`Failed Runs`}
					value={failedRuns}
					sub={failedRuns > 0 ? t`action needed` : undefined}
					icon={AlertCircle}
					color={col3}
				/>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Terminal className="h-4 w-4 text-amber" />
								<Trans>Recent Runs</Trans>
							</CardTitle>
							<Link
								to="/spark/runs"
								search={{ runId: "" }}
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{wfL ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Bone
										key={i}
										loading
										name={`spark-wf-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : wfs.length === 0 ? (
							<EmptyBox
								title={t`No workflows`}
								desc={t`Create your first workflow to automate tasks.`}
								icon={Play}
								action={t`Create Workflow`}
								onClick={() => {
									navigate("/spark/workflows/new");
								}}
							/>
						) : (
							wfs.map((w) => <WorkflowRow key={w.id} w={w} />)
						)}
					</CardContent>
				</Card>
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Terminal className="h-4 w-4 text-amber" />
								<Trans>Recent Runs</Trans>
							</CardTitle>
							<Link
								to="/spark/runs"
								search={{ runId: "" }}
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{rL ? (
							<div className="space-y-2">
								{[1, 2].map((i) => (
									<Bone
										key={i}
										loading
										name={`spark-run-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : runs.length === 0 ? (
							<EmptyBox
								title={t`No runs yet`}
								desc={t`Workflow executions will appear here.`}
								icon={Terminal}
							/>
						) : (
							runs.map((r) => <RunRow key={r.id} r={r} />)
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
