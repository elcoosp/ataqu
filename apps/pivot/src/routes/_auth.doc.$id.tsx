import {
	useCreateDocument,
	useDeleteDocument,
	useGetDocument,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Button } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { DocumentEditor } from "@/components/document-editor";
import { RelationsPanel } from "@/components/relations-panel";
import { TemplatePicker } from "@/components/template-picker";
import { VersionHistory } from "@/components/version-history";

export const Route = createFileRoute("/_auth/doc/$id")({
	component: DocumentDetail,
});

function DocumentDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data, error, refetch } = useGetDocument(id);
	const deleteMutation = useDeleteDocument({
		onSuccess: () => {
			toast.success(<Trans>Document deleted.</Trans>);
			navigate({ to: "/" });
		},
		onError: (err) => toast.error(handleApiError(err)),
	});
	const createMutation = useCreateDocument({
		onSuccess: (doc) => {
			toast.success(<Trans>Document duplicated.</Trans>);
			navigate({ to: "/doc/$id", params: { id: doc.id } });
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	if (error) toast.error(handleApiError(error));

	const handleDelete = () => {
		deleteMutation.mutate(id);
	};

	const handleDuplicate = () => {
		if (data) {
			createMutation.mutate({
				title: `${data.title} (copy)`,
				content: data.content,
			});
		}
	};

	if (!data)
		return (
			<div>
				<Trans>Loading…</Trans>
			</div>
		);

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between p-2 border-b border-border">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate({ to: "/" })}
					>
						← <Trans>Back</Trans>
					</Button>
					<TemplatePicker documentId={id} onApplied={refetch}>
						<Button variant="outline" size="sm">
							<Trans>Apply Template</Trans>
						</Button>
					</TemplatePicker>
					<VersionHistory
						documentId={id}
						currentVersion={data.version}
						onRestore={refetch}
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleDuplicate}>
						<Trans>Duplicate</Trans>
					</Button>
				</div>
			</div>
			<DocumentEditor
				id={id}
				initialDoc={data}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
			/>
			<div className="p-4 border-t border-border">
				<RelationsPanel docId={id} />
			</div>
		</div>
	);
}
