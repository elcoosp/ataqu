import { useListEmployees, useListLeaveRequests } from "@ataqu/api-client";
import {
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
	Building2,
	Calendar,
	Plus,
	Users,
} from "lucide-react";

export const Route = createFileRoute("/_auth/pause/dashboard")({
	component: PauseDashboard,
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
					<div
						className={`rounded-full p-2.5 ${color ?? "bg-amber-500/10 text-amber-400"}`}
					>
						<Icon className="h-4 w-4" />
					</div>
				</div>
			</div>
		</Card>
	);
}

function LeaveRow({
	r,
}: {
	r: {
		id: string;
		employee_name?: string;
		leave_type: string;
		start_date: string;
		end_date: string;
		status: string;
	};
}) {
	const s =
		r.status === "approved"
			? "bg-emerald-500/15 text-emerald-400"
			: r.status === "pending"
				? "bg-amber-500/15 text-amber-400"
				: "bg-gray-500/15 text-gray-400";
	return (
		<Link to="/pause/employees/$id" params={{ id: r.id }} className="block">
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-white">
								{r.employee_name ?? r.id.slice(0, 8)}
							</p>
							<p className="text-xs text-muted-foreground">
								{r.leave_type} · {r.start_date} → {r.end_date}
							</p>
						</div>
						<span className={`text-xs px-1.5 py-0.5 rounded-full ${s}`}>
							{r.status}
						</span>
					</div>
				</CardContent>
			</Card>
		</Link>
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

function PauseDashboard() {
	const { data: employeesData } = useListEmployees({
		limit: 50,
	});
	const { data: leaveData, isLoading: lL } = useListLeaveRequests({ limit: 5 });
	const employees = employeesData?.items ?? [];
	const leaves = leaveData?.items ?? [];
	const activeCount = employees.filter((e) => e.is_active).length;
	const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
	const approvedLeaves = leaves.filter((l) => l.status === "approved").length;
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>People</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>Manage employees, leave requests, and onboarding.</Trans>
					</p>
				</div>
				<Button size="sm" asChild>
					<Link to="/pause/directory">
						<Plus className="h-3.5 w-3.5 mr-1.5" />
						<Trans>Add Employee</Trans>
					</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					label={t`Total Employees`}
					value={employees.length}
					sub={`${activeCount} active`}
					icon={Users}
					color="bg-amber-500/10 text-amber-400"
				/>
				<MetricCard
					label={t`Pending Requests`}
					value={pendingLeaves}
					sub={`${approvedLeaves} approved`}
					icon={Calendar}
					color="bg-blue-500/10 text-blue-400"
				/>
				<MetricCard
					label={t`Onboarded`}
					value={employees.filter((e) => e.onboarding_completed_at).length}
					sub={`${employees.filter((e) => e.onboarding_completed_at).length > 0 ? t`all onboarding complete` : t`onboarding in progress`}`}
					icon={Building2}
				/>
				<MetricCard
					label={t`Review Needed`}
					value={pendingLeaves}
					icon={AlertCircle}
					color={
						pendingLeaves > 0 ? "bg-amber-500/10 text-amber-400" : undefined
					}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Calendar className="h-4 w-4 text-amber" />
								<Trans>Recent Leave Requests</Trans>
							</CardTitle>
							<Link
								to="/pause/directory"
								className="text-xs text-amber hover:text-amber-300 flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{lL ? (
							<div className="space-y-2">
								{[1, 2].map((i) => (
									<Bone
										key={i}
										loading
										name={`pause-leave-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : leaves.length === 0 ? (
							<EmptyBox
								title={t`No leave requests`}
								desc={t`Employee time-off requests will appear here.`}
								icon={Calendar}
							/>
						) : (
							leaves.slice(0, 5).map((r) => <LeaveRow key={r.id} r={r} />)
						)}
					</CardContent>
				</Card>
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-white">
							<Trans>Quick Actions</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button variant="outline" className="w-full justify-start" asChild>
							<Link to="/pause/directory">
								<Users className="h-4 w-4 mr-2" />
								<Trans>Browse Employees</Trans>
							</Link>
						</Button>
						<Button variant="outline" className="w-full justify-start" asChild>
							<Link to="/pause/onboarding">
								<Building2 className="h-4 w-4 mr-2" />
								<Trans>Onboarding</Trans>
							</Link>
						</Button>
						<Button variant="outline" className="w-full justify-start" asChild>
							<Link to="/pause/reports">
								<Calendar className="h-4 w-4 mr-2" />
								<Trans>Reports</Trans>
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
