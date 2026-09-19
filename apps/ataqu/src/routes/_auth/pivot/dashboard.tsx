import {
	useListDatabases,
	useListDocuments,
	useListTemplates,
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
import { ArrowRight, Database, FileText, LayoutGrid, Plus } from "lucide-react";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/pivot/dashboard")({
	component: PivotDashboard,
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

function DbRow({
	db,
}: {
	db: { id: string; name: string; description?: string };
}) {
	return (
		<Link to="/pivot/db/$id" params={{ id: db.id }} className="block">
			<Card className="mb-3 hover:border-amber/30 transition-colors cursor-pointer">
				<CardContent className="p-4">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-amber/15 flex items-center justify-center">
							<Database className="h-4 w-4 text-amber" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="text-sm font-semibold text-white truncate">
								{db.name}
							</h4>
							{db.description && (
								<p className="text-xs text-muted-foreground truncate">
									{db.description}
								</p>
							)}
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

function PivotDashboard() {
	const { data: dbsData, isLoading: dL } = useListDatabases({ limit: 5 });
	const { data: tplData, isLoading: tL } = useListTemplates();
	const databases = dbsData ?? [];
	const templates = tplData ?? [];
	const { data: docsData } = useListDocuments();
	const documents = docsData ?? [];
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-heading font-bold text-white">
						<Trans>Pivot</Trans>
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						<Trans>Databases, documents, and relations in one workspace.</Trans>
					</p>
				</div>
				<Button size="sm" asChild>
					<Link to="/pivot/db">
						<Plus className="h-3.5 w-3.5 mr-1.5" />
						<Trans>New Database</Trans>
					</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					label={t`Databases`}
					value={databases.length}
					sub={`${templates.length} templates`}
					icon={Database}
					color="bg-amber/10 text-amber"
				/>
				<MetricCard
					label={t`Documents`}
					value={documents.length}
					sub={t`across all databases`}
					icon={FileText}
				/>
				<MetricCard
					label={t`Templates`}
					value={templates.length}
					sub={t`reusable templates`}
					icon={LayoutGrid}
				/>
				<MetricCard
					label={t`Docs / DB`}
					value={
						databases.length
							? (documents.length / databases.length).toFixed(1)
							: "0"
					}
					sub={t`average per database`}
					icon={LayoutGrid}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-white flex items-center gap-2">
								<Database className="h-4 w-4 text-amber" />
								<Trans>Databases</Trans>
							</CardTitle>
							<Link
								to="/pivot/db"
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
										name={`pivot-db-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : databases.length === 0 ? (
							<EmptyBox
								title={t`No databases`}
								desc={t`Create a database to start organizing your data.`}
								icon={Database}
								action={t`Create Database`}
								onClick={() => {
									navigate("/pivot/db");
								}}
							/>
						) : (
							databases.slice(0, 5).map((db) => <DbRow key={db.id} db={db} />)
						)}
					</CardContent>
				</Card>
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-white">
							<Trans>Templates</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{tL ? (
							<div className="space-y-2">
								{[1].map((i) => (
									<Bone
										key={i}
										loading
										name={`pivot-tpl-${i}`}
										fallback={<div className="h-14 w-full bg-muted rounded" />}
									>
										{null}
									</Bone>
								))}
							</div>
						) : templates.length === 0 ? (
							<EmptyBox
								title={t`No templates`}
								desc={t`Create templates to speed up document creation.`}
								icon={FileText}
								action={t`Create Template`}
								onClick={() => {
									navigate("/pivot/templates");
								}}
							/>
						) : (
							templates.map((tpl) => (
								<Link
									key={tpl.id}
									to="/pivot/templates"
									className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
								>
									<span className="text-sm text-white">{tpl.name}</span>
									<Badge variant="secondary" className="text-xs">
										used
									</Badge>
								</Link>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
