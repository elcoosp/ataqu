import {
	useCreateRelation,
	useDeleteRelation,
	useListRelations,
} from "@ataqu/api-client";
import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function RelationsPanel({ docId }: { docId: string }) {
	const queryClient = useQueryClient();
	const { data: relations, isLoading } = useListRelations(docId, {
		limit: 100,
	});
	const [fromBlock, setFromBlock] = useState("");
	const [toBlock, setToBlock] = useState("");
	const [relationType, setRelationType] = useState("reference");
	const [submitting, setSubmitting] = useState(false);

	const createRelation = useCreateRelation({
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["pivot", "relations", docId],
			});
			toast.success("Relation created.");
			setFromBlock("");
			setToBlock("");
			setRelationType("reference");
		},
		onError: () => toast.error("Create failed"),
	});

	const deleteRelation = useDeleteRelation({
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["pivot", "relations", docId],
			});
			toast.success("Relation deleted.");
		},
		onError: () => toast.error("Delete failed"),
	});

	const handleSubmit = () => {
		if (!fromBlock.trim() || !toBlock.trim() || !relationType.trim()) {
			toast.error("All fields are required.");
			return;
		}
		setSubmitting(true);
		createRelation
			.mutateAsync({
				docId,
				data: {
					from_block_id: fromBlock.trim(),
					to_block_id: toBlock.trim(),
					relation_type: relationType.trim(),
				},
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<div className="space-y-4">
			<h3 className="font-heading text-lg font-semibold">
				<Trans>Relations</Trans>
			</h3>
			{isLoading ? (
				<p className="text-sm text-muted-foreground">
					<Trans>Loading…</Trans>
				</p>
			) : (
				<ul className="space-y-1">
					{(relations || []).map((r) => (
						<li
							key={r.id}
							className="flex items-center justify-between text-sm border border-border rounded-md p-2"
						>
							<span className="font-mono text-xs truncate">
								{r.from_block_id} → {r.to_block_id} ({r.relation_type})
							</span>
							<button
								type="button"
								className="text-red-400 hover:text-red-300 text-xs"
								onClick={() => deleteRelation.mutate(r.id)}
							>
								<Trans>Delete</Trans>
							</button>
						</li>
					))}
					{(relations || []).length === 0 && (
						<li className="text-sm text-muted-foreground">
							<Trans>No relations yet.</Trans>
						</li>
					)}
				</ul>
			)}
			<div className="space-y-2 rounded-md border border-border p-3">
				<div>
					<Label>
						<Trans>From block</Trans>
					</Label>
					<Input
						value={fromBlock}
						onChange={(e) => setFromBlock(e.target.value)}
						placeholder="block id"
					/>
				</div>
				<div>
					<Label>
						<Trans>To block</Trans>
					</Label>
					<Input
						value={toBlock}
						onChange={(e) => setToBlock(e.target.value)}
						placeholder="block id"
					/>
				</div>
				<div>
					<Label>
						<Trans>Type</Trans>
					</Label>
					<Input
						value={relationType}
						onChange={(e) => setRelationType(e.target.value)}
						placeholder="reference"
					/>
				</div>
				<Button onClick={handleSubmit} disabled={submitting} size="sm">
					<Trans>Add relation</Trans>
				</Button>
			</div>
		</div>
	);
}
