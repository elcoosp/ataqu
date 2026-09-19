import {
	useListActivities,
	useListContacts,
	useListDeals,
	useListPipelineStages,
} from "@ataqu/api-client";
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
	ArrowRight,
	Clock,
	DollarSign,
	Plus,
	Search,
	TrendingUp,
	Users,
} from "lucide-react";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/cinq/dashboard")({
	component: CinqDashboard,
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
						className={`rounded-full p-2.5 ${color ?? "bg-amber/10 text-amber"}`}
					>
						<Icon className="h-4 w-4" />
					</div>
				</div>
			</div>
		</Card>
	);
}

function fmtMoney(n: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(n);
}

function DealRow({
	deal,
}: {
	deal: {
		id: string;
		title: string;
		amount: number;
		status: string;
		probability?: number;
	};
}) {
	const s =
		deal.status === "won"
			? "bg-success/15 text-success"
			: deal.status === "lost"
				? "bg-destructive/15 text-destructive"
				: "bg-amber/15 text-amber";
	return (
		<Link
			to="/cinq/deals/$id"
			params={{ id: deal.id }}
			search={{ tab: "activities" }}
			className="block"
		>
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex-1 min-w-0">
							<h4 className="text-sm font-semibold text-white truncate">
								{deal.title}
							</h4>
							<p
								className={`text-xs mt-0.5 inline-block px-1.5 rounded-full ${s}`}
							>
								{deal.status}
							</p>
						</div>
						<div className="text-right">
							<p className="text-sm font-bold text-white">
								{fmtMoney(deal.amount)}
							</p>
							{deal.probability !== undefined && (
								<p className="text-xs text-muted-foreground">
									{deal.probability}%
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function ContactRow({
	contact,
}: {
	contact: {
		id: string;
		name: string;
		email: string;
		company?: string;
		lead_score?: number;
	};
}) {
	return (
		<Link
			to="/cinq/contacts/$id"
			params={{ id: contact.id }}
			search={{ tab: "activities" }}
			className="block"
		>
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-amber/15 flex items-center justify-center">
							<Users className="h-4 w-4 text-amber" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="text-sm font-semibold text-white truncate">
								{contact.name}
							</h4>
							<p className="text-xs text-muted-foreground truncate">
								{contact.email}
							</p>
							{contact.company && (
								<p className="text-xs text-muted-foreground truncate">
									{contact.company}
								</p>
							)}
						</div>
						{contact.lead_score !== undefined && contact.lead_score > 0 && (
							<Badge variant="secondary" className="font-medium shrink-0">
								<span className="text-xs">{contact.lead_score}</span>
							</Badge>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function ActivityRow({
	a,
}: {
	a: {
		id: string;
		activity_type: string;
		description: string;
		created_at: string;
	};
}) {
	const cls =
		{
			call: "bg-success/10 text-success",
			email: "bg-info/10 text-info",
			meeting: "bg-info/10 text-info",
			task: "bg-amber/10 text-amber",
			note: "bg-muted/10 text-muted-foreground",
		}[a.activity_type] ?? "bg-muted/10 text-muted-foreground";
	const I =
		{ call: Search, email: Search, meeting: Clock, task: Plus, note: Clock }[
			a.activity_type
		] ?? Clock;
	return (
		<div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
			<div
				className={`w-8 h-8 rounded-full flex items-center justify-center ${cls}`}
			>
				<I className="h-3.5 w-3.5" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm text-white truncate">{a.description}</p>
				<p className="text-xs text-muted-foreground">
					{new Date(a.created_at).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</p>
			</div>
			<Link
				to="/cinq/contacts/$id"
				params={{ id: a.id }}
				search={{ tab: "activities" }}
				className="text-xs text-amber hover:text-amber flex items-center gap-1"
			>
				View
			</Link>
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

function CinqDashboard() {
	const { data: dealsData, isLoading: dL } = useListDeals({ limit: 5 });
	const { data: contactsData, isLoading: cL } = useListContacts({ limit: 5 });
	const { data: pipelineData } = useListPipelineStages();
	const { data: activitiesData, isLoading: aL } = useListActivities({
		limit: 8,
	});

	const deals = dealsData?.items ?? [];
	const contacts = contactsData?.items ?? [];
	const stages = pipelineData ?? [];
	const activities = activitiesData?.items ?? [];

	const totalVal = deals.reduce((s, d) => s + d.amount, 0);
	const wonVal = deals
		.filter((d) => d.status === "won")
		.reduce((s, d) => s + d.amount, 0);
	const openCount = deals.filter((d) => d.status === "open").length;

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>Sales Pipeline</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>
							Track deals, contacts, and activity across your pipeline.
						</Trans>
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" asChild>
						<Link to="/cinq/contacts">
							<Search className="h-3.5 w-3.5 mr-1.5" />
							<Trans>Search</Trans>
						</Link>
					</Button>
					<Button size="sm" asChild>
						<Link to="/cinq/contacts">
							<Plus className="h-3.5 w-3.5 mr-1.5" />
							<Trans>Add Contact</Trans>
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					label={t`Total Pipeline`}
					value={fmtMoney(totalVal)}
					sub={`${deals.length} deals in pipeline`}
					icon={DollarSign}
					color="bg-success/10 text-success"
				/>
				<MetricCard
					label={t`Won Revenue`}
					value={fmtMoney(wonVal)}
					sub={
						deals.some((d) => d.status === "won")
							? t`Closed won deals`
							: undefined
					}
					icon={TrendingUp}
					color="bg-info/10 text-info"
				/>
				<MetricCard
					label={t`Open Deals`}
					value={openCount}
					sub={`${contacts.length} contacts`}
					icon={Users}
				/>
				<MetricCard
					label={t`Conversion`}
					value={deals.length > 0 ? Math.round((wonVal / totalVal) * 100) : 0}
					sub={t`% of pipeline won`}
					icon={TrendingUp}
					color="bg-info/10 text-info"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<DollarSign className="h-4 w-4 text-amber" />
								<Trans>Recent Deals</Trans>
							</CardTitle>
							<Link
								to="/cinq/deals"
								search={{ createOpen: false, stageOpen: false }}
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
										name={`cinq-deal-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : deals.length === 0 ? (
							<EmptyBox
								title={t`No deals yet`}
								desc={t`Create your first deal to start tracking your pipeline.`}
								icon={DollarSign}
								action={t`Create Deal`}
								onClick={() => {
									navigate("/cinq/deals");
								}}
							/>
						) : (
							deals.map((deal) => <DealRow key={deal.id} deal={deal} />)
						)}
					</CardContent>
				</Card>
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Users className="h-4 w-4 text-amber" />
								<Trans>Recent Contacts</Trans>
							</CardTitle>
							<Link
								to="/cinq/contacts"
								className="text-xs text-amber hover:text-amber flex items-center gap-1"
							>
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{cL ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Bone
										key={i}
										loading
										name={`cinq-contact-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : contacts.length === 0 ? (
							<EmptyBox
								title={t`No contacts yet`}
								desc={t`Add contacts to start building your pipeline.`}
								icon={Users}
								action={t`Add Contact`}
								onClick={() => {
									navigate("/cinq/contacts");
								}}
							/>
						) : (
							contacts.map((c) => <ContactRow key={c.id} contact={c} />)
						)}
					</CardContent>
				</Card>
			</div>

			{stages.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-amber" />
							<Trans>Pipeline Stages</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{stages.map((stage) => (
								<Badge
									key={stage.id}
									variant="secondary"
									className="font-medium"
								>
									{stage.name}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<Card className="overflow-hidden">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
							<Clock className="h-4 w-4 text-amber" />
							<Trans>Recent Activity</Trans>
						</CardTitle>
						<Link
							to="/cinq/tasks"
							search={{ createOpen: false }}
							className="text-xs text-amber hover:text-amber flex items-center gap-1"
						>
							View all <ArrowRight className="h-3 w-3" />
						</Link>
					</div>
				</CardHeader>
				<CardContent>
					{aL ? (
						<div className="space-y-2">
							{[1, 2, 3, 4].map((i) => (
								<Bone
									key={i}
									loading
									name={`cinq-activity-${i}`}
									fallback={<div className="h-10 w-full bg-muted rounded" />}
								>
									{null}
								</Bone>
							))}
						</div>
					) : activities.length === 0 ? (
						<EmptyBox
							title={t`No activity yet`}
							desc={t`Calls, emails, and meetings will appear here.`}
							icon={Clock}
						/>
					) : (
						activities.map((a) => <ActivityRow key={a.id} a={a} />)
					)}
				</CardContent>
			</Card>
		</div>
	);
}
