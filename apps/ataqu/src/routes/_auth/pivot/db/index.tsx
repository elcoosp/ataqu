import { useCreateDatabase, useListDatabases } from "@ataqu/api-client";
import { useIntent } from "@ataqu/shared-stores";

import { handleApiError } from "@ataqu/shared-utils";
import { Button, EmptyState, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/pivot/db/")({
	component: DatabaseList,
});

function DatabaseList() {
	const { data, refetch, error, isLoading } = useListDatabases();

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

	// ⌘K "Create Database" (brainstorm P2-2 context scope).
	useIntent("pivot", "db.create", () => {
		handleCreate();
	});

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
			{isLoading ? (
				// Skeleton parity (P1-4): the old `data?.length === 0` check
				// rendered an empty grid while the list was still in flight.
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{["a", "b", "c", "d", "e", "f"].map((key) => (
						<div key={key} className="border border-border rounded p-4">
							<Skeleton className="h-4 w-1/2" />
						</div>
					))}
				</div>
			) : error ? (
				<div className="py-8 text-center text-sm text-destructive">
					<Trans>Couldn't load databases.</Trans>
				</div>
			) : data?.length === 0 ? (
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
							to="/pivot/db/$id"
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
