import { api } from "@ataqu/api-client";
import { useIdempotency } from "@ataqu/shared-hooks";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface TemplatePickerProps {
	documentId: string;
	onApplied?: () => void;
	children: React.ReactNode;
}

export function TemplatePicker({
	documentId,
	onApplied,
	children,
}: TemplatePickerProps) {
	const [open, setOpen] = useState(false);
	const { getKey } = useIdempotency();
	const {
		data: templates,
		isLoading,
		error,
	} = useQuery<any[]>({
		queryKey: ["templates"],
		queryFn: () => api.get("/templates"),
	});

	if (error) toast.error(handleApiError(error));

	const applyMutation = useMutation({
		mutationFn: (templateId: string) =>
			api.post(
				`/docs/${documentId}/apply-template`,
				{ templateId },
				{ headers: { "Idempotency-Key": getKey() } },
			),
		onSuccess: () => {
			toast.success(<Trans>Template applied.</Trans>);
			onApplied?.();
			setOpen(false);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						<Trans>Apply Template</Trans>
					</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-4 mt-4">
					{isLoading && (
						<p>
							<Trans>Loading templates…</Trans>
						</p>
					)}
					{templates?.map((t: any) => (
						<div
							key={t.id}
							className="border border-border rounded p-3 hover:border-primary cursor-pointer"
							onClick={() => applyMutation.mutate(t.id)}
						>
							<h4 className="font-medium">{t.name}</h4>
							<p className="text-sm text-muted-foreground truncate">
								{t.content}
							</p>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
