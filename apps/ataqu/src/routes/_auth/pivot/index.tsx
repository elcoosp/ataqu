import { useCreateDocument, useListDocuments } from "@ataqu/api-client";
import { useIntent } from "@ataqu/shared-stores";
import { handleApiError } from "@ataqu/shared-utils";
import { Button, EmptyState, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "../../../apps/pivot/components/search-bar";
import { navigate } from "../../../lib/navigation";

export const Route = createFileRoute("/_auth/pivot/")({
	component: DocumentList,
});

function DocumentList() {
	const { data, refetch, error, isLoading } = useListDocuments();
	const createMutation = useCreateDocument({
		onSuccess: () => {
			toast.success(<Trans>Document created.</Trans>);
			refetch();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleCreate = () => {
		createMutation.mutate({ title: "Untitled", content: "" });
	};

	// ⌘K "Create Document" (brainstorm P2-2 context scope).
	useIntent("pivot", "doc.create", () => {
		handleCreate();
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-heading">
					<Trans>Documents</Trans>
				</h1>
				<Button size="sm" onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-1" />
					<Trans>Create Document</Trans>
				</Button>
			</div>

			<SearchBar
				className="max-w-sm"
				onResultClick={(result) => {
					if (result.type === "document") {
						navigate(`/pivot/doc/${result.id}`);
					}
				}}
			/>

			{isLoading ? (
				// Skeleton parity (P1-4): never render "empty" while the list is
				// still in flight — the old `data?.length === 0` check fell through
				// to an empty grid on first paint.
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{["a", "b", "c", "d", "e", "f"].map((key) => (
						<div key={key} className="border border-border rounded p-4">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="mt-2 h-3 w-full" />
						</div>
					))}
				</div>
			) : error ? (
				<div className="py-8 text-center text-sm text-destructive">
					<Trans>Couldn't load documents.</Trans>
				</div>
			) : (data ?? []).length === 0 ? (
				<EmptyState
					icon={FileText}
					title={<Trans>No documents</Trans>}
					description={
						<Trans>
							Create your first document, or link it to a CINQ deal.
						</Trans>
					}
					ctaLabel={<Trans>Create Document</Trans>}
					onCta={handleCreate}
				/>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{data?.map((doc) => (
						<Link
							key={doc.id}
							to="/pivot/doc/$id"
							params={{ id: doc.id }}
							className="block"
						>
							<div className="border border-border rounded p-4 hover:border-primary transition-colors">
								<h3 className="font-medium">{doc.title}</h3>
								<p className="text-sm text-muted-foreground">
									{doc.content?.slice(0, 60)}…
								</p>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
