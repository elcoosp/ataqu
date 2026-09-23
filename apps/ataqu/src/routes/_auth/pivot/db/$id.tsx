import { useGetDatabase } from "@ataqu/api-client";
import { Button, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DatabaseGrid } from "../../../../apps/pivot/components/database-grid";

export const Route = createFileRoute("/_auth/pivot/db/$id")({
	component: DatabaseDetail,
});

function DatabaseDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data, error, isLoading } = useGetDatabase(id);

	if (error)
		return (
			<div className="py-8 text-center text-sm text-destructive">
				<Trans>Couldn't load this database.</Trans>
			</div>
		);
	if (isLoading || !data)
		return (
			<div className="space-y-3">
				<Skeleton className="h-6 w-1/3" />
				<Skeleton className="h-40 w-full" />
			</div>
		);

	const columns = [
		{ name: "Name", type: "text" as const },
		{ name: "Amount", type: "number" as const },
		{ name: "Date", type: "date" as const },
		{ name: "Status", type: "select" as const },
		{ name: "Deal", type: "relation" as const },
	];

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/pivot/db" })}
				>
					← <Trans>Back</Trans>
				</Button>
				<h1 className="text-2xl font-heading">{data.name}</h1>
			</div>
			<DatabaseGrid databaseId={id} columns={columns} />
		</div>
	);
}
