import {
	type CreateFormRequest,
	type UpdateFormRequest,
	useCreateForm,
	useGetForm,
	useUpdateForm,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Button,
	Shell,
	Skeleton,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@ataqu/ui";
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Save, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandingTab } from "../components/builder/branding-tab";
import { ConversationalToggle } from "../components/builder/conversational-toggle";
import { FormBuilder } from "../components/builder/form-builder";
import type {
	FormMode,
	SondBranding,
	SondForm,
	SondQuestion,
} from "../components/builder/types";
import { FormPreview } from "../components/preview/form-preview";

export const Route = createFileRoute("/_auth/builder/$id")({
	component: FormBuilderRoute,
});

function FormBuilderRoute() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [previewOpen, setPreviewOpen] = useState(false);
	const [localForm, setLocalForm] = useState<SondForm | null>(null);

	const isExisting = id !== "new";
	const { data: fetchedForm, isLoading } = useGetForm(
		isExisting ? id : "00000000-0000-0000-0000-000000000000",
		{ enabled: isExisting, queryKey: ["sond", "form", id] },
	);

	const createMutation = useCreateForm({
		onSuccess: (data) => {
			toast.success(t`Form created`);
			navigate({ to: "/builder/$id", params: { id: data.id }, replace: true });
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const updateMutation = useUpdateForm({
		onSuccess: (data) => {
			setLocalForm((prev) =>
				prev ? { ...prev, version: data.version } : prev,
			);
			queryClient.invalidateQueries({ queryKey: ["sond", "form", id] });
			toast.success(t`Form saved`);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	useEffect(() => {
		if (fetchedForm) {
			const sondForm: SondForm = {
				...fetchedForm,
				questions: fetchedForm.questions.map((q) => {
					const qWithPage = q as unknown as typeof q & { page?: number };
					return { ...q, page: qWithPage.page ?? 1 } as SondQuestion;
				}),
				branding: (fetchedForm.branding ?? {}) as SondBranding,
				mode: fetchedForm.mode as FormMode,
			};
			setLocalForm(sondForm);
		}
	}, [fetchedForm]);

	useEffect(() => {
		if (id === "new" && !createMutation.isPending && !localForm) {
			const defaultQuestions = [
				{
					label: t`Untitled Question`,
					type: "text" as const,
					required: false,
					page: 1,
				},
			];
			createMutation.mutate({
				title: t`Untitled Form`,
				questions:
					defaultQuestions as unknown as CreateFormRequest["questions"],
				mode: "standard",
				branding: {},
			} as CreateFormRequest);
		}
	}, [id, createMutation, localForm]);

	if (id === "new") {
		return (
			<Shell activeApp="sond">
				<div className="p-8">
					<Skeleton className="h-8 w-48 mb-4" />
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			</Shell>
		);
	}

	if (isLoading && !localForm) {
		return (
			<Shell activeApp="sond">
				<div className="p-8">
					<Skeleton className="h-16 w-full mb-4" />
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			</Shell>
		);
	}

	if (!localForm) {
		return (
			<Shell activeApp="sond">
				<div className="p-8">
					<Trans>Form not found.</Trans>
				</div>
			</Shell>
		);
	}

	const updateQuestions = (questions: SondQuestion[]) =>
		setLocalForm((f) => (f ? { ...f, questions } : f));
	const updateMode = (mode: FormMode) =>
		setLocalForm((f) => (f ? { ...f, mode } : f));
	const updateBranding = (branding: Partial<SondBranding>) =>
		setLocalForm((f) =>
			f ? { ...f, branding: { ...f.branding, ...branding } } : f,
		);
	const updateTitle = (title: string) =>
		setLocalForm((f) => (f ? { ...f, title } : f));

	const handleSave = useCallback(() => {
		if (!localForm) return;
		const { id: formId, questions, title, mode, branding } = localForm;
		const questionsPayload = questions.map(
			({ id: _qid, ...rest }) => rest,
		) as unknown as UpdateFormRequest["questions"];
		updateMutation.mutate({
			id: formId,
			data: {
				title,
				questions: questionsPayload,
				mode,
				branding,
			} as UpdateFormRequest,
		});
	}, [localForm, updateMutation]);

	const handlePublish = useCallback(() => {
		if (!localForm) return;
		const { id: formId, questions, title, mode, branding } = localForm;
		const questionsPayload = questions.map(
			({ id: _qid, ...rest }) => rest,
		) as unknown as UpdateFormRequest["questions"];
		updateMutation.mutate(
			{
				id: formId,
				data: {
					title,
					questions: questionsPayload,
					mode,
					branding,
				} as UpdateFormRequest,
			},
			{ onSuccess: () => toast.success(t`Form published`) },
		);
	}, [localForm, updateMutation]);

	return (
		<Shell activeApp="sond">
			<div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
				<header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
					<input
						value={localForm.title}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTitle(e.target.value)}
						className="truncate bg-transparent text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={t`Form title`}
					/>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							onClick={handleSave}
							disabled={updateMutation.isPending}
						>
							<Save className="mr-2 h-4 w-4" />
							{updateMutation.isPending ? t`Saving...` : <Trans>Save</Trans>}
						</Button>
						<Button variant="outline" onClick={() => setPreviewOpen(true)}>
							<Eye className="mr-2 h-4 w-4" />
							<Trans>Preview</Trans>
						</Button>
						<Button
							className="bg-primary text-primary-foreground hover:bg-primary/90"
							onClick={handlePublish}
							disabled={updateMutation.isPending}
						>
							<Upload className="mr-2 h-4 w-4" />
							<Trans>Publish</Trans>
						</Button>
					</div>
				</header>

				<Tabs
					defaultValue="builder"
					className="flex flex-1 flex-col overflow-hidden"
				>
					<TabsList className="mx-6 mt-4 w-fit">
						<TabsTrigger value="builder">
							<Trans>Builder</Trans>
						</TabsTrigger>
						<TabsTrigger value="settings">
							<Trans>Settings</Trans>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="builder" className="mt-0 flex-1 overflow-hidden">
						<FormBuilder
							questions={localForm.questions}
							onUpdate={updateQuestions}
						/>
					</TabsContent>

					<TabsContent
						value="settings"
						className="mt-0 flex-1 overflow-y-auto p-6"
					>
						<div className="mx-auto max-w-2xl space-y-8">
							<ConversationalToggle
								mode={localForm.mode}
								onChange={updateMode}
							/>
							<div className="overflow-hidden rounded-lg border border-border bg-card">
								<div className="border-b border-border p-4 font-medium">
									<Trans>Branding</Trans>
								</div>
								<BrandingTab
									branding={localForm.branding}
									onUpdate={updateBranding}
								/>
							</div>
						</div>
					</TabsContent>
				</Tabs>

				<FormPreview
					form={localForm}
					open={previewOpen}
					onClose={() => setPreviewOpen(false)}
				/>
			</div>
		</Shell>
	);
}
