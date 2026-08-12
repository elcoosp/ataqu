import {
	exportFormSubmissions,
	useGetForm,
	useListSubmissions,
	useUpdateForm,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Inbox, Shell } from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { IntegrationToggle } from "../components/integration-toggle";
import {
	SubmissionsTable,
	SubmissionsTableSkeleton,
} from "../components/submissions-table";

export const Route = createFileRoute("/_auth/submissions/$id")({
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

	const handleToggleCinq = useCallback(
		(enabled: boolean) => {
			setCinqEnabled(enabled);
			if (form) {
				const rules = enabled
					? [
							{
								conditions: [],
								actions: [{ type: "create_lead" as const, target: "cinq" }],
							},
						]
					: [];
				updateFormMutation.mutate({
					id,
					data: {
						routing_rules: rules as Parameters<
							typeof updateFormMutation.mutate
						>[0]["data"]["routing_rules"],
					},
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
					data: {
						routing_rules: rules as Parameters<
							typeof updateFormMutation.mutate
						>[0]["data"]["routing_rules"],
					},
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
			<Shell activeApp="sond">
				<div className="mx-auto max-w-7xl p-8">
					<SubmissionsTableSkeleton />
				</div>
			</Shell>
		);
	}

	return (
		<Shell activeApp="sond">
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
		</Shell>
	);
}
