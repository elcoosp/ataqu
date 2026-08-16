import { listDatabases, useCreateDatabase } from "@ataqu/api-client";

import { handleApiError } from "@ataqu/shared-utils";
import { Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import type { Database as DatabaseType } from "@/types";

export const Route = createFileRoute("/_auth/db/")({
	component: DatabaseList,
});

function DatabaseList() {
	const { data, refetch, error } = useQuery<DatabaseType[]>({
		queryKey: ["databases"],
		queryFn: () => listDatabases(),
	});

	if (error) toast.error(handleApiError(error));

	const createMutation = useCreateDatabase({
		onSuccess: () => {
			toast.success(<Trans>Database created.</Trans>);
			refetch();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleCreate = () => {
		createMutation.mutate({ name: "New Database" });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-heading">
					<Trans>Databases</Trans>
				</h1>
				<Button size="sm" onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-1" />
					<Trans>Create Database</Trans>
				</Button>
			</div>
			{data?.length === 0 ? (
				<EmptyState
					icon={Database}
					title={<Trans>No databases</Trans>}
					description={
						<Trans>
							Create your first database to start storing structured data.
						</Trans>
					}
					ctaLabel={<Trans>Create Database</Trans>}
					onCta={handleCreate}
				/>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{data?.map((db) => (
						<Link
							key={db.id}
							to="/db/$id"
							params={{ id: db.id }}
							className="block"
						>
							<div className="border border-border rounded p-4 hover:border-primary transition-colors">
								<h3 className="font-medium">{db.name}</h3>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
