import { updateDocument, useListDocumentVersions } from "@ataqu/api-client";

import { formatDate, handleApiError } from "@ataqu/shared-utils";
import {
	Bone,
	Button,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface VersionHistoryProps {
	documentId: string;
	currentVersion: number;
	onRestore?: () => void;
}

export function VersionHistory({
	documentId,
	currentVersion,
	onRestore,
}: VersionHistoryProps) {
	const [open, setOpen] = useState(false);
	const {
		data: versions,
		isLoading,
		error,
	} = useListDocumentVersions(documentId);

	if (error) toast.error(handleApiError(error));

	const updateMutation = useMutation({
		mutationFn: (data: { title: string; content: string; version: number }) =>
			updateDocument(documentId, data),
		onSuccess: () => {
			toast.success(<Trans>Version restored.</Trans>);
			onRestore?.();
			setOpen(false);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleRestore = (version: any) => {
		updateMutation.mutate({
			title: version.title,
			content: version.content,
			version: version.version,
		});
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm">
					<Trans>Version History</Trans>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-[400px] sm:w-[540px]">
				<SheetHeader>
					<SheetTitle>
						<Trans>Version History</Trans>
					</SheetTitle>
				</SheetHeader>
				<div className="mt-4 space-y-2">
					<Bone
						loading={isLoading}
						name="versions"
						fallback={
							<p>
								<Trans>Loading…</Trans>
							</p>
						}
					>
						{versions?.map((v: any) => (
							<div
								key={v.id}
								className="flex items-center justify-between p-2 border-b border-border"
							>
								<div>
									<p className="text-sm font-medium">{v.title}</p>
									<p className="text-xs text-muted-foreground">
										{formatDate(v.created_at)} • v{v.version}
									</p>
								</div>
								{v.version !== currentVersion && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleRestore(v)}
									>
										<Trans>Restore</Trans>
									</Button>
								)}
							</div>
						))}
					</Bone>
				</div>
			</SheetContent>
		</Sheet>
	);
}
