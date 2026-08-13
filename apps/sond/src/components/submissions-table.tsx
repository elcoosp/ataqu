import {
	type AnswerInput,
	type Submission,
	useBulkDeleteSubmissions,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Button,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
	submissions: Submission[];
	onExport: () => void;
	onRefresh: () => void;
}

function answerToString(a: AnswerInput): string {
	const v = a.value.value;
	if (typeof v === "string") return v;
	if (typeof v === "number") return String(v);
	if (Array.isArray(v)) return v.join(", ");
	return String(v ?? "");
}

export function SubmissionsTable({ submissions, onExport, onRefresh }: Props) {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const bulkDelete = useBulkDeleteSubmissions({
		onSuccess: () => {
			toast.success(t`${selected.size} submission(s) deleted`);
			setSelected(new Set());
			onRefresh();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const toggleSelect = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		if (selected.size === submissions.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(submissions.map((s) => s.id)));
		}
	};

	const handleBulkDelete = () => {
		if (selected.size === 0) return;
		bulkDelete.mutate({ ids: Array.from(selected) });
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-end gap-2">
				{selected.size > 0 && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleBulkDelete}
						disabled={bulkDelete.isPending}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						<Trans>Delete {selected.size} selected</Trans>
					</Button>
				)}
				<Button variant="outline" onClick={onExport}>
					<Download className="mr-2 h-4 w-4" />
					<Trans>Export CSV</Trans>
				</Button>
			</div>
			<div className="rounded-md border border-border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<input
									type="checkbox"
									checked={
										selected.size === submissions.length &&
										submissions.length > 0
									}
									onChange={toggleAll}
									aria-label={t`Select all submissions`}
								/>
							</TableHead>
							<TableHead>
								<Trans>Submitted At</Trans>
							</TableHead>
							<TableHead>
								<Trans>Answer 1</Trans>
							</TableHead>
							<TableHead>
								<Trans>Answer 2</Trans>
							</TableHead>
							<TableHead>
								<Trans>Answer 3</Trans>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{submissions.map((s) => {
							const answers = s.answers.slice(0, 3);
							return (
								<TableRow
									key={s.id}
									data-state={selected.has(s.id) ? "selected" : undefined}
								>
									<TableCell>
										<input
											type="checkbox"
											checked={selected.has(s.id)}
											onChange={() => toggleSelect(s.id)}
											aria-label={t`Select submission from ${new Date(s.submitted_at).toLocaleString()}`}
										/>
									</TableCell>
									<TableCell>
										{new Date(s.submitted_at).toLocaleString()}
									</TableCell>
									<TableCell>
										{answers[0] ? answerToString(answers[0]) : "—"}
									</TableCell>
									<TableCell>
										{answers[1] ? answerToString(answers[1]) : "—"}
									</TableCell>
									<TableCell>
										{answers[2] ? answerToString(answers[2]) : "—"}
									</TableCell>
								</TableRow>
							);
						})}
						{submissions.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-center text-muted-foreground"
								>
									<Trans>No submissions</Trans>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export function SubmissionsTableSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Skeleton className="h-10 w-32" />
			</div>
			<div className="rounded-md border border-border p-4 space-y-3">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		</div>
	);
}
