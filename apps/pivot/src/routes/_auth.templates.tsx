import { useCreateTemplate, useListTemplates } from "@ataqu/api-client";

import { handleApiError } from "@ataqu/shared-utils";
import { Bone, Button, Input } from "@ataqu/ui";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_auth/templates")({
	component: TemplatesPage,
});

function TemplatesPage() {
	const { data, refetch, error } = useListTemplates();

	if (error) toast.error(handleApiError(error));

	const [showCreator, setShowCreator] = useState(false);
	const [name, setName] = useState("");
	const [content, setContent] = useState("");

	const createMutation = useCreateTemplate({
		onSuccess: () => {
			toast.success(<Trans>Template created.</Trans>);
			setShowCreator(false);
			setName("");
			setContent("");
			refetch();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleCreate = () => {
		if (!name.trim()) return toast.error(<Trans>Name is required.</Trans>);
		createMutation.mutate({ name, content });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-heading">
					<Trans>Templates</Trans>
				</h1>
				<Button size="sm" onClick={() => setShowCreator(true)}>
					<Plus className="h-4 w-4 mr-1" />
					<Trans>Create Template</Trans>
				</Button>
			</div>
			{showCreator && (
				<div className="border border-border rounded p-4 space-y-3">
					<Input
						placeholder={i18n._("Template name")}
						value={name}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setName(e.target.value)
						}
					/>
					<textarea
						className="w-full p-2 border border-border rounded bg-background"
						rows={6}
						placeholder={i18n._("Template content (markdown)")}
						value={content}
						onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
							setContent(e.target.value)
						}
					/>
					<div className="flex gap-2">
						<Button onClick={handleCreate}>
							<Trans>Save</Trans>
						</Button>
						<Button variant="outline" onClick={() => setShowCreator(false)}>
							<Trans>Cancel</Trans>
						</Button>
					</div>
				</div>
			)}
			<Bone
				loading={!data && !error}
				name="templates-grid"
				fallback={
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="h-24 rounded border border-border" />
					</div>
				}
			>
				{data?.length === 0 ? (
					<EmptyState
						icon={FileText}
						title={<Trans>No templates</Trans>}
						description={
							<Trans>Create a template to reuse document structures.</Trans>
						}
						ctaLabel={<Trans>Create Template</Trans>}
						onCta={() => setShowCreator(true)}
					/>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{data?.map((t) => (
							<div key={t.id} className="border border-border rounded p-4">
								<h3 className="font-medium">{t.name}</h3>
								<p className="text-sm text-muted-foreground truncate">
									{t.content}
								</p>
							</div>
						))}
					</div>
				)}
			</Bone>
		</div>
	);
}
