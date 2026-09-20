import {
	type AnswerInput,
	type Submission,
	useBulkDeleteSubmissions,
} from "@ataqu/api-client";
import { useSelectionStore } from "@ataqu/shared-stores";
import { formatDateTime, handleApiError } from "@ataqu/shared-utils";
import {
	Bone,
	Button,
	SelectAllCheckbox,
	SelectionCheckbox,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	VirtualRows,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
	submissions: Submission[];
	onExport: () => void;
	onRefresh: () => void;
	/** Selection scope for cross-navigation persistence (spec 2.7) */
	scope?: string;
}

function answerToString(a: AnswerInput): string {
	const v = a.value.value;
	if (typeof v === "string") return v;
	if (typeof v === "number") return String(v);
	if (Array.isArray(v)) return v.join(", ");
	return String(v ?? "");
}

export function SubmissionsTable({
	submissions,
	onExport,
	onRefresh,
	scope = "sond:submissions",
}: Props) {
	const selected = useSelectionStore((s) => s.selections[scope]);
	const clear = useSelectionStore((s) => s.clear);
	const bulkDelete = useBulkDeleteSubmissions({
		onSuccess: () => {
			toast.success(t`${selected?.size ?? 0} submission(s) deleted`);
			clear(scope);
			onRefresh();
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const ids = submissions.map((s) => s.id);
	const selectedIds = Array.from(selected ?? []).filter((id) =>
		ids.includes(id),
	);

	const maxAnswers = submissions.reduce(
		(n, s) => Math.max(n, s.answers?.length ?? 0),
		0,
	);

	const handleBulkDelete = () => {
		if (selectedIds.length === 0) return;
		bulkDelete.mutate({ ids: selectedIds });
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-end gap-2">
				{selectedIds.length > 0 && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleBulkDelete}
						disabled={bulkDelete.isPending}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						<Trans>Delete {selectedIds.length} selected</Trans>
					</Button>
				)}
				<Button variant="outline" onClick={onExport}>
					<Download className="mr-2 h-4 w-4" />
					<Trans>Export CSV</Trans>
				</Button>
			</div>
			<VirtualRows count={submissions.length} estimateSize={40} maxHeight={520}>
				{({ padTop, padBottom, items, measureElement }) => (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<SelectAllCheckbox scope={scope} ids={ids} />
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
							{padTop > 0 && (
								<tr style={{ height: `${padTop}px` }} aria-hidden="true" />
							)}
							{items.map((vRow) => {
								const s = submissions[vRow.index];
								const answers = s.answers.slice(0, 3);
								return (
									<TableRow
										key={s.id}
										data-index={vRow.index}
										ref={measureElement}
										data-state={selected?.has(s.id) ? "selected" : undefined}
									>
										<TableCell>
											<SelectionCheckbox scope={scope} id={s.id} />
										</TableCell>
										<TableCell>{formatDateTime(s.submitted_at)}</TableCell>
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
							{padBottom > 0 && (
								<tr style={{ height: `${padBottom}px` }} aria-hidden="true" />
							)}
							{submissions.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={2 + maxAnswers}
										className="py-8 text-center text-muted-foreground"
									>
										<Trans>No submissions</Trans>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				)}
			</VirtualRows>
		</div>
	);
}

export function SubmissionsTableSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Bone
					loading
					name="submissions-table-1"
					fallback={<div className="h-10 w-32" />}
				>
					{null}
				</Bone>
			</div>
			<div className="rounded-md border border-border p-4 space-y-3">
				{Array.from({ length: 5 }).map((_, i) => (
					<Bone
						key={i}
						loading
						name="submissions-table-2"
						fallback={<div className="h-10 w-full" />}
					>
						{null}
					</Bone>
				))}
			</div>
		</div>
	);
}
