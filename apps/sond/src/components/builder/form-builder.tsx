import type { FormQuestion } from "@ataqu/api-client";
import { Button, cn } from "@ataqu/ui";
import {
	DndContext,
	type DragEndEvent,
	useDraggable,
	useDroppable,
} from "@dnd-kit/core";
import { Trans, t } from "@lingui/macro";
import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConditionalLogicModal } from "./conditional-logic-modal";
import { QuestionConfigPanel } from "./question-config-panel";
import { QuestionPalette } from "./question-palette";
import type { SondQuestion } from "./types";

interface Props {
	questions: SondQuestion[];
	onUpdate: (questions: SondQuestion[]) => void;
}

function QuestionCard({
	question,
	selected,
	onSelect,
	onDelete,
}: {
	question: SondQuestion;
	selected: boolean;
	onSelect: () => void;
	onDelete: () => void;
}) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: `q-${question.id}`,
	});
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: `q-${question.id}`,
	});
	const setRefs = (node: HTMLDivElement | null) => {
		setNodeRef(node);
		setDropRef(node);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSelect();
		}
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			onDelete();
		}
	};

	return (
		<div
			ref={setRefs}
			{...attributes}
			{...listeners}
			role="button"
			tabIndex={0}
			aria-selected={selected}
			aria-label={question.label || t`Untitled question`}
			onClick={onSelect}
			onKeyDown={handleKeyDown}
			className={cn(
				"cursor-pointer rounded-lg border bg-card p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				selected
					? "border-l-4 border-l-primary shadow-md"
					: "border-border hover:border-primary/50",
				isOver && "ring-2 ring-primary",
			)}
		>
			<div className="flex items-start justify-between">
				<div>
					<div className="font-medium">
						{question.label || t`Untitled Question`}
					</div>
					<div className="text-xs capitalize text-muted-foreground">
						{question.type.replace("_", " ")} · <Trans>Page</Trans>{" "}
						{question.page}
					</div>
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					onKeyDown={(e) => e.stopPropagation()}
					className="text-muted-foreground hover:text-destructive"
					aria-label={t`Delete question`}
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

export function FormBuilder({ questions, onUpdate }: Props) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [logicModalOpen, setLogicModalOpen] = useState(false);
	const { isOver, setNodeRef } = useDroppable({ id: "canvas" });

	const selectedQuestion = questions.find((q) => q.id === selectedId) ?? null;

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over) return;
			const activeId = String(active.id);
			const overId = String(over.id);

			if (activeId.startsWith("palette-")) {
				const type = active.data.current?.type as FormQuestion["type"];
				if (!type) return;
				const newQ: SondQuestion = {
					id: crypto.randomUUID(),
					label: "",
					type,
					required: false,
					page: 1,
					options:
						type === "choice" || type === "multiple_choice"
							? [t`Option 1`]
							: undefined,
					min: type === "rating" ? 1 : undefined,
					max: type === "rating" ? 5 : undefined,
				};
				let insertIndex = questions.length;
				if (overId.startsWith("q-")) {
					const targetId = overId.slice(2);
					const idx = questions.findIndex((q) => q.id === targetId);
					if (idx !== -1) insertIndex = idx;
				}
				const newQuestions = [...questions];
				newQuestions.splice(insertIndex, 0, newQ);
				onUpdate(newQuestions);
				setSelectedId(newQ.id);
				toast.success(t`Question added`);
			} else if (activeId.startsWith("q-") && overId.startsWith("q-")) {
				const activeQid = activeId.slice(2);
				const overQid = overId.slice(2);
				if (activeQid === overQid) return;
				const oldIndex = questions.findIndex((q) => q.id === activeQid);
				const newIndex = questions.findIndex((q) => q.id === overQid);
				if (oldIndex === -1 || newIndex === -1) return;
				const newQuestions = [...questions];
				const moved = newQuestions.splice(oldIndex, 1)[0];
				if (moved) {
					newQuestions.splice(newIndex, 0, moved);
				}
				onUpdate(newQuestions);
			}
		},
		[questions, onUpdate],
	);

	const handleUpdateQuestion = useCallback(
		(updates: Partial<SondQuestion>) => {
			if (!selectedId) return;
			onUpdate(
				questions.map((q) => (q.id === selectedId ? { ...q, ...updates } : q)),
			);
		},
		[selectedId, questions, onUpdate],
	);

	const handleDelete = useCallback(
		(id: string) => {
			onUpdate(questions.filter((q) => q.id !== id));
			if (selectedId === id) setSelectedId(null);
			toast.success(t`Question deleted`);
		},
		[questions, selectedId, onUpdate],
	);

	const handleSaveCondition = useCallback(
		(condition: NonNullable<SondQuestion["conditions"]>[number]) => {
			if (!selectedId) return;
			onUpdate(
				questions.map((q) =>
					q.id === selectedId ? { ...q, conditions: [condition] } : q,
				),
			);
			toast.success(t`Conditional logic saved`);
		},
		[selectedId, questions, onUpdate],
	);

	const handleAddPageBreak = useCallback(() => {
		if (!selectedId) return;
		const maxPage = questions.reduce((m, q) => Math.max(m, q.page), 0);
		onUpdate(
			questions.map((q) =>
				q.id === selectedId ? { ...q, page: maxPage + 1 } : q,
			),
		);
		toast.success(t`Page break added`);
	}, [selectedId, questions, onUpdate]);

	return (
		<DndContext onDragEnd={handleDragEnd}>
			<div className="flex h-full">
				<QuestionPalette />
				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="border-b border-border bg-card px-4 py-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleAddPageBreak}
							disabled={!selectedId}
						>
							<Trans>Add Page Break</Trans>
						</Button>
					</div>
					<div
						ref={setNodeRef}
						className={cn(
							"flex-1 overflow-y-auto p-8 transition-colors",
							isOver && "bg-primary/5",
						)}
					>
						<div className="mx-auto max-w-2xl space-y-4">
							{questions.length === 0 && (
								<div className="rounded-lg border-2 border-dashed border-border py-20 text-center text-muted-foreground">
									<Trans>Drag questions here to build your form</Trans>
								</div>
							)}
							{questions.map((q) => (
								<QuestionCard
									key={q.id}
									question={q}
									selected={selectedId === q.id}
									onSelect={() => setSelectedId(q.id)}
									onDelete={() => handleDelete(q.id)}
								/>
							))}
						</div>
					</div>
				</div>
				<QuestionConfigPanel
					question={selectedQuestion}
					onUpdate={handleUpdateQuestion}
					onAddCondition={() => setLogicModalOpen(true)}
				/>
			</div>
			<ConditionalLogicModal
				open={logicModalOpen}
				question={selectedQuestion}
				questions={questions}
				onSave={handleSaveCondition}
				onClose={() => setLogicModalOpen(false)}
			/>
		</DndContext>
	);
}
