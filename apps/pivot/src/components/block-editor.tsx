import type { Block } from "@ataqu/api-client";
import { useListBlocks, useUpdateBlock } from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Button, Label } from "@ataqu/ui";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { toast } from "sonner";

interface BlockEditorProps {
	documentId: string;
}

interface MarkdownContent {
	text?: string;
}
interface TableContent {
	columns?: string[];
	rows?: string[][];
}
interface ViewContent {
	filter?: string;
}
interface ChecklistItem {
	id: string;
	text: string;
	checked: boolean;
}

function contentToString(content: unknown, type: string): string {
	if (type === "markdown") {
		const c = (content ?? {}) as MarkdownContent;
		return c.text ?? "";
	}
	if (type === "view") {
		const c = (content ?? {}) as ViewContent;
		return c.filter ?? "";
	}
	if (type === "table") {
		const c = (content ?? {}) as TableContent;
		const cols = (c.columns ?? []).join(",");
		const rows = (c.rows ?? []).map((r) => r.join("|")).join("\n");
		return [cols, rows].filter(Boolean).join("\n");
	}
	if (type === "checklist") {
		const c = (content ?? {}) as { items?: ChecklistItem[] };
		return (c.items ?? [])
			.map((it) => `${it.checked ? "[x]" : "[ ]"} ${it.text}`)
			.join("\n");
	}
	return JSON.stringify(content ?? {});
}

function buildContent(type: string, raw: string): Record<string, unknown> {
	if (type === "markdown") return { text: raw };
	if (type === "view") return { filter: raw };
	if (type === "table") {
		const lines = raw.split("\n").filter((l) => l.trim().length > 0);
		const columns = (lines[0] ?? "").split(",").map((s) => s.trim());
		const rows = lines.slice(1).map((l) => l.split("|").map((s) => s.trim()));
		return { columns, rows };
	}
	if (type === "checklist") {
		const items = raw
			.split("\n")
			.filter((l) => l.trim().length > 0)
			.map((l, idx) => {
				const checked = /^\[x\]/i.test(l.trim());
				const text = l.replace(/^\[[ x]\]\s*/i, "").trim();
				return { id: `item-${idx}`, text, checked };
			});
		return { items };
	}
	return { raw };
}

function placeholderFor(type: string): string {
	if (type === "table")
		return i18n._("Header row comma-separated, then one row per line with |");
	if (type === "checklist")
		return i18n._("[ ] unchecked / [x] checked, one per line");
	if (type === "view") return i18n._("Filter expression");
	return i18n._("Markdown text");
}

function BlockRow({ block }: { block: Block }) {
	const [raw, setRaw] = useState(() =>
		contentToString(block.content, block.block_type),
	);
	const updateMutation = useUpdateBlock({
		onSuccess: (data) => {
			toast.success(i18n._("Block saved."));
			if (data && typeof data.version === "number") {
				block.version = data.version;
			}
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	const rows =
		block.block_type === "checklist" || block.block_type === "table" ? 5 : 3;

	return (
		<div className="rounded-lg border border-border p-3 space-y-2">
			<div className="flex items-center justify-between">
				<Label className="capitalize">{block.block_type}</Label>
				<span className="text-xs text-muted-foreground">v{block.version}</span>
			</div>
			<textarea
				className="w-full rounded-md border border-input bg-background p-2 text-sm font-mono"
				rows={rows}
				value={raw}
				onChange={(e) => setRaw(e.target.value)}
				placeholder={placeholderFor(block.block_type)}
			/>
			<div className="flex justify-end">
				<Button
					size="sm"
					disabled={updateMutation.isPending}
					onClick={() =>
						updateMutation.mutate({
							id: block.id,
							data: { content: buildContent(block.block_type, raw) },
							version: block.version,
						})
					}
				>
					<Trans>Save Block</Trans>
				</Button>
			</div>
		</div>
	);
}

export function BlockEditor({ documentId }: BlockEditorProps) {
	const { data: blocks = [], isLoading } = useListBlocks(documentId);

	if (isLoading) {
		return (
			<div className="p-3 text-sm text-muted-foreground">
				<Trans>Loading blocks…</Trans>
			</div>
		);
	}

	if (blocks.length === 0) {
		return (
			<div className="p-3 text-sm text-muted-foreground">
				<Trans>No blocks for this document.</Trans>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{blocks.map((block) => (
				<BlockRow key={block.id} block={block} />
			))}
		</div>
	);
}
