import { useDeleteDocument, useUpdateDocument } from "@ataqu/api-client";
import { Button, cn } from "@ataqu/ui";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import {
	BlockquotePlugin,
	BoldPlugin,
	CodePlugin,
	H1Plugin,
	H2Plugin,
	H3Plugin,
	ItalicPlugin,
	StrikethroughPlugin,
	UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { IndentPlugin } from "@platejs/indent/react";
import { ListPlugin } from "@platejs/list/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { Copy, FileDown, Trash2 } from "lucide-react";
import {
	Plate,
	PlateContent,
	PlateElement,
	PlateLeaf,
	useEditorRef,
	useEditorValue,
	usePath,
	usePlateEditor,
} from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BlockEditor } from "@/components/block-editor";
import type { Document } from "@/types";

interface DocumentEditorProps {
	id: string;
	initialDoc: Document;
	onDelete?: () => void;
	onDuplicate?: () => void;
}

// ---- Element renderers -------------------------------------------------------

const _ParagraphElement = (props: any) => (
	<PlateElement {...props} className="my-2" />
);

const H1Element = (props: any) => (
	<PlateElement {...props} as="h1" className="mb-2 mt-4 text-2xl font-bold" />
);
const H2Element = (props: any) => (
	<PlateElement
		{...props}
		as="h2"
		className="mb-2 mt-4 text-xl font-semibold"
	/>
);
const H3Element = (props: any) => (
	<PlateElement
		{...props}
		as="h3"
		className="mb-1 mt-3 text-lg font-semibold"
	/>
);

const BlockquoteElement = (props: any) => (
	<PlateElement
		{...props}
		as="blockquote"
		className="my-2 border-l-2 border-border pl-3 italic text-muted-foreground"
	/>
);

const _CodeBlockElement = (props: any) => (
	<PlateElement
		{...props}
		as="pre"
		className="my-2 overflow-x-auto rounded bg-muted p-3 font-mono text-sm"
	/>
);

const ListElement = (props: any) => {
	const { element } = props;
	const ordered = element.listStyleType === "decimal";
	return (
		<PlateElement
			{...props}
			as={ordered ? "ol" : "ul"}
			className="my-2 pl-6"
			style={{ listStyleType: element.listStyleType ?? "disc" }}
		/>
	);
};

const ListItemElement = (props: any) => {
	const editor = useEditorRef();
	const path = usePath();
	const element = props.element;
	const isTask = typeof element.checked === "boolean";

	const toggle = (value: boolean) => {
		if (path) editor.tf.setNodes({ checked: value } as any, { at: path });
	};

	if (!isTask) {
		return <PlateElement {...props} as="li" className="my-1" />;
	}

	return (
		<PlateElement {...props} as="li" className="my-1 flex items-center gap-2">
			<input
				type="checkbox"
				checked={!!element.checked}
				onChange={(e) => toggle(e.target.checked)}
				className="h-4 w-4 accent-primary"
			/>
			<span className={cn(element.checked && "line-through opacity-60")}>
				{props.children}
			</span>
		</PlateElement>
	);
};

// ---- Leaf renderers ----------------------------------------------------------

const BoldLeaf = (props: any) => <PlateLeaf {...props} as="strong" />;
const ItalicLeaf = (props: any) => <PlateLeaf {...props} as="em" />;
const UnderlineLeaf = (props: any) => <PlateLeaf {...props} as="u" />;
const StrikethroughLeaf = (props: any) => <PlateLeaf {...props} as="s" />;
const CodeLeaf = (props: any) => (
	<PlateLeaf
		{...props}
		as="code"
		className="rounded bg-muted px-1 font-mono text-sm"
	/>
);

export function DocumentEditor({
	id,
	initialDoc,
	onDelete,
	onDuplicate,
}: DocumentEditorProps) {
	const [title, setTitle] = useState(initialDoc.title);
	const [version, setVersion] = useState(initialDoc.version);
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const updateMutation = useUpdateDocument({
		onSuccess: (data) => {
			setSaveStatus("saved");
			if (typeof data?.version === "number") setVersion(data.version);
			setTimeout(() => setSaveStatus("idle"), 1500);
		},
		onError: (error) => {
			toast.error(error.message || i18n._("Failed to save."));
			setSaveStatus("idle");
		},
	});

	const deleteMutation = useDeleteDocument({
		onSuccess: () => {
			toast.success(<Trans>Document deleted.</Trans>);
			onDelete?.();
		},
		onError: (error) =>
			toast.error(error.message || i18n._("Failed to delete.")),
	});

	const editor = usePlateEditor({
		plugins: [
			MarkdownPlugin,
			BoldPlugin.withComponent(BoldLeaf),
			ItalicPlugin.withComponent(ItalicLeaf),
			UnderlinePlugin.withComponent(UnderlineLeaf),
			StrikethroughPlugin.withComponent(StrikethroughLeaf),
			CodePlugin.withComponent(CodeLeaf),
			H1Plugin.withComponent(H1Element),
			H2Plugin.withComponent(H2Element),
			H3Plugin.withComponent(H3Element),
			BlockquotePlugin.withComponent(BlockquoteElement),
			CodePlugin,
			ListPlugin,
			IndentPlugin,
		],
		components: {
			ul: ListElement,
			ol: ListElement,
			li: ListItemElement,
		},
		value: (e) => {
			const md = initialDoc.content?.trim();
			if (!md) return [{ children: [{ text: "" }], type: "p" }];
			try {
				return e.getApi(MarkdownPlugin).markdown.deserialize(md);
			} catch {
				return [{ children: [{ text: md }], type: "p" }];
			}
		},
	});

	const serialize = () => {
		try {
			return editor.api.markdown.serialize();
		} catch {
			return "";
		}
	};

	// Autosave whenever the editor content changes.
	const value = useEditorValue();
	const persist = useCallback(() => {
		setSaveStatus("saving");
		updateMutation.mutate({
			id,
			data: { title, content: serialize() },
			version,
		});
	}, [id, title, version, updateMutation, serialize]);

	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(persist, 600);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [value, title, persist]);

	const handleExport = () => {
		const blob = new Blob([serialize()], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${title || "document"}.md`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success(<Trans>Exported.</Trans>);
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-border p-2">
				<span className="text-xs text-muted-foreground">
					{saveStatus === "saving" && <Trans>Saving…</Trans>}
					{saveStatus === "saved" && <Trans>Saved.</Trans>}
				</span>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleExport}>
						<FileDown className="mr-1 h-4 w-4" />
						<Trans>Export</Trans>
					</Button>
					<Button variant="outline" size="sm" onClick={onDuplicate}>
						<Copy className="h-4 w-4" />
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => deleteMutation.mutate(id)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-auto p-4">
				<input
					value={title}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setTitle(e.target.value)
					}
					className="mb-4 w-full bg-transparent text-2xl font-semibold outline-none"
					placeholder={i18n._("Document title")}
				/>
				<Plate editor={editor}>
					<PlateContent
						className="prose prose-sm prose-invert max-w-none focus:outline-none"
						placeholder={i18n._("Write…")}
					/>
				</Plate>
			</div>

			<details className="border-t border-border">
				<summary className="cursor-pointer p-3 text-sm font-medium text-muted-foreground hover:text-foreground">
					<Trans>Structured blocks</Trans>
				</summary>
				<div className="p-3">
					<BlockEditor documentId={id} />
				</div>
			</details>
		</div>
	);
}
