import {
	exportFormSubmissions,
	useGetForm,
	useListSubmissions,
	useUpdateForm,
} from "@ataqu/api-client";
import { useIntent } from "@ataqu/shared-stores";
import { handleApiError } from "@ataqu/shared-utils";
import { useRegisterCommands } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { setLeadIntegration } from "../../../../apps/sond/components/integration-rules";
import { IntegrationToggle } from "../../../../apps/sond/components/integration-toggle";
import {
	SubmissionsTable,
	SubmissionsTableSkeleton,
} from "../../../../apps/sond/components/submissions-table";

export const Route = createFileRoute("/_auth/sond/submissions/$id")({
	component: SubmissionsRoute,
});

function SubmissionsRoute() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const { data: submissions = [], isLoading, refetch } = useListSubmissions(id);
	const { data: form } = useGetForm(id);
	const [cinqEnabled, setCinqEnabled] = useState(false);
	const [sparkEnabled, setSparkEnabled] = useState(false);

	const updateFormMutation = useUpdateForm({
		onSuccess: () => toast.success(t`Integration updated`),
		onError: (err) => toast.error(handleApiError(err)),
	});

	const exportMutation = useMutation({
		mutationFn: () => exportFormSubmissions(id),
		onSuccess: (blob) => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `submissions-${id}.csv`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t`Submissions exported`);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	// ⌘K "Export Submissions CSV" acts on the form being viewed (P2-2): the
	// palette raises `sond:submissions.export` and this screen is the only one
	// that can answer it for this form. This replaces the CustomEvent
	// dispatched under `sond:export-csv`, which had no listener.
	useIntent("sond", "submissions.export", () => {
		exportMutation.mutate();
	});

	// Form-scoped export: visible in ⌘K only while THIS form's submissions
	// screen is mounted, so the label means exactly what it says (P2 context
	// scope). The bus intent above is the same action for programmatic
	// callers.
	useRegisterCommands([
		{
			id: `sond:${id}:export`,
			title: t`Export submissions CSV`,
			keywords: "download csv export",
			onSelect: () => exportMutation.mutate(),
		},
	]);

	const handleToggleCinq = useCallback(
		(enabled: boolean) => {
			setCinqEnabled(enabled);
			if (form) {
				const rules = setLeadIntegration(form.routing_rules ?? [], enabled);
				updateFormMutation.mutate({
					id,
					data: { routing_rules: rules },
					version: form?.version,
				});
			}
		},
		[form, id, updateFormMutation],
	);

	const handleToggleSpark = useCallback(
		(enabled: boolean) => {
			setSparkEnabled(enabled);
			if (form) {
				const rules = enabled
					? [
							{
								conditions: [],
								actions: [
									{
										type: "webhook" as const,
										url: "",
										method: "POST",
										body: {},
										headers: {},
									},
								],
							},
						]
					: [];
				updateFormMutation.mutate({
					id,
					data: { routing_rules: rules },
					version: form?.version,
				});
			}
		},
		[form, id, updateFormMutation],
	);

	const handleRefresh = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["sond", "submissions", id] });
		refetch();
	}, [queryClient, id, refetch]);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-7xl p-8">
				<SubmissionsTableSkeleton />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-7xl space-y-8 p-8">
			<h1 className="text-3xl font-bold">
				<Trans>Submissions</Trans>
			</h1>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<IntegrationToggle
					label={t`Create CINQ lead on submission`}
					enabled={cinqEnabled}
					onToggle={handleToggleCinq}
					connectedBadge={t`Connected to CINQ`}
				/>
				<IntegrationToggle
					label={t`Trigger SPARK workflow on submission`}
					enabled={sparkEnabled}
					onToggle={handleToggleSpark}
					connectedBadge={t`Connected to SPARK`}
				/>
			</div>

			{submissions.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="mb-4 rounded-full bg-muted p-4">
						<Inbox className="h-8 w-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold">
						<Trans>No submissions yet</Trans>
					</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						<Trans>Publish your form to start collecting responses.</Trans>
					</p>
				</div>
			) : (
				<SubmissionsTable
					submissions={submissions}
					onExport={() => exportMutation.mutate()}
					onRefresh={handleRefresh}
				/>
			)}
		</div>
	);
}
