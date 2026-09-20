import { useGetKpis, useListDashboards } from "@ataqu/api-client";
import { formatDate } from "@ataqu/shared-utils";
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
	ArrowRight,
	BarChart3,
	Briefcase,
	Calendar,
	DollarSign,
	Package,
	Plus,
	ShoppingCart,
	TrendingUp,
	Users,
} from "lucide-react";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/vista/dashboard")({
	component: VistaDashboard,
});

function KpiCard({
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
	color: string;
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
					<div className={color}>
						<Icon className="h-4 w-4" />
					</div>
				</div>
			</div>
		</Card>
	);
}

function DashboardRow({
	d,
}: {
	d: { id: string; name: string; updated_at: string };
}) {
	return (
		<Link to="/vista/dashboard/$id" params={{ id: d.id }} className="block">
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-semibold text-white">{d.name}</h4>
							<p className="text-xs text-muted-foreground mt-0.5">
								<Trans>Updated</Trans> {formatDate(d.updated_at)}
							</p>
						</div>
						<ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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

function fmtMoney(n: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(n);
}

function VistaDashboard() {
	const { data: kpis } = useGetKpis();
	const { data: dashboardsData, isLoading: dL } = useListDashboards();
	const dashboards = dashboardsData ?? [];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>Cross-App View</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>KPIs and dashboards across every app.</Trans>
					</p>
				</div>
				<Button size="sm" asChild>
					<Link to="/vista">
						<Plus className="h-3.5 w-3.5 mr-1.5" />
						<Trans>New Dashboard</Trans>
					</Link>
				</Button>
			</div>
			{kpis && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<KpiCard
						label={t`Pipeline Value`}
						value={fmtMoney(kpis.total_pipeline_value)}
						sub={`${kpis.total_deals} deals`}
						icon={DollarSign}
						color="bg-success/10 text-success"
					/>
					<KpiCard
						label={t`Revenue Won`}
						value={fmtMoney(kpis.total_revenue)}
						sub={`${kpis.total_deals_won} won`}
						icon={TrendingUp}
						color="bg-info/10 text-info"
					/>
					<KpiCard
						label={t`Contacts`}
						value={kpis.total_contacts}
						sub={t`total contacts`}
						icon={Users}
						color="bg-info/10 text-info"
					/>
					<KpiCard
						label={t`Bookings`}
						value={kpis.total_bookings}
						sub={t`upcoming`}
						icon={Calendar}
						color="bg-amber/10 text-amber"
					/>
					<KpiCard
						label={t`Products`}
						value={kpis.total_products}
						sub={t`in inventory`}
						icon={ShoppingCart}
						color="bg-info/10 text-info"
					/>
					<KpiCard
						label={t`Low Stock`}
						value={kpis.low_stock_variants}
						sub={
							kpis.low_stock_variants > 0 ? t`needs attention` : t`all stocked`
						}
						icon={Package}
						color={
							kpis.low_stock_variants > 0
								? "bg-destructive/10 text-destructive"
								: "bg-muted/10 text-muted-foreground"
						}
					/>
					<KpiCard
						label={t`Leave Requests`}
						value={kpis.pending_leave_requests}
						sub={
							kpis.pending_leave_requests > 0 ? t`pending review` : t`all clear`
						}
						icon={Briefcase}
						color={
							kpis.pending_leave_requests > 0
								? "bg-amber/10 text-amber"
								: "bg-muted/10 text-muted-foreground"
						}
					/>
					<KpiCard
						label={t`Events`}
						value={kpis.total_events}
						sub={t`logged`}
						icon={BarChart3}
						color="bg-info/10 text-info"
					/>
				</div>
			)}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<BarChart3 className="h-4 w-4 text-amber" />
								<Trans>Dashboards</Trans>
							</CardTitle>
							<Link
								to="/vista"
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{dL ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Bone
										key={i}
										loading
										name={`vista-db-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : dashboards.length === 0 ? (
							<EmptyBox
								title={t`No dashboards`}
								desc={t`Build cross-app dashboards to spot trends across your workspace.`}
								icon={BarChart3}
								action={t`Create Dashboard`}
								onClick={() => {
									navigate("/vista");
								}}
							/>
						) : (
							dashboards.map((d) => <DashboardRow key={d.id} d={d} />)
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
