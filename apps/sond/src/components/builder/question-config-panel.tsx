import { Accordion, Button, Input } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useId } from "react";
import { Switch } from "../ui/switch";
import type { SondQuestion } from "./types";

interface Props {
	question: SondQuestion | null;
	onUpdate: (updates: Partial<SondQuestion>) => void;
	onAddCondition: () => void;
}

export function QuestionConfigPanel({
	question,
	onUpdate,
	onAddCondition,
}: Props) {
	const labelId = useId();
	const requiredId = useId();
	const optionsId = useId();
	const ratingId = useId();
	const pageId = useId();

	if (!question) {
		return (
			<div className="flex w-80 items-center justify-center border-l border-border bg-background p-6 text-muted-foreground">
				<Trans>Select a question to configure</Trans>
			</div>
		);
	}

	const isChoiceType =
		question.type === "choice" || question.type === "multiple_choice";

	const questionSection = (
		<div>
			<label htmlFor={labelId} className="mb-2 block text-sm font-medium">
				<Trans>Question Text</Trans>
			</label>
			<Input
				id={labelId}
				value={question.label}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					onUpdate({ label: e.target.value })
				}
				placeholder={t`e.g., What is your name?`}
			/>
			<div className="mt-3 flex items-center justify-between">
				<label htmlFor={requiredId} className="text-sm font-medium">
					<Trans>Required</Trans>
				</label>
				<Switch
					id={requiredId}
					checked={question.required}
					onCheckedChange={(checked: boolean) =>
						onUpdate({ required: checked })
					}
				/>
			</div>
		</div>
	);

	const optionsSection = isChoiceType ? (
		<div>
			<label className="mb-2 block text-sm font-medium" id={optionsId}>
				<Trans>Options</Trans>
			</label>
			<div className="space-y-2" role="group" aria-labelledby={optionsId}>
				{(question.options || []).map((opt) => (
					<Input
						key={opt}
						value={opt}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							const newOpts = (question.options || []).map((o) =>
								o === opt ? e.target.value : o,
							);
							onUpdate({ options: newOpts });
						}}
						aria-label={t`Option: ${opt}`}
					/>
				))}
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						onUpdate({
							options: [
								...(question.options || []),
								t`Option ${(question.options || []).length + 1}`,
							],
						})
					}
				>
					<Trans>Add Option</Trans>
				</Button>
			</div>
		</div>
	) : null;

	const ratingSection =
		question.type === "rating" ? (
			<div className="space-y-2">
				<label className="block text-sm font-medium" id={ratingId}>
					<Trans>Rating Scale</Trans>
				</label>
				<div
					className="flex items-center gap-2"
					role="group"
					aria-labelledby={ratingId}
				>
					<Input
						type="number"
						value={question.min ?? 1}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							onUpdate({ min: Number(e.target.value) })
						}
						className="w-20"
						aria-label={t`Minimum rating`}
					/>
					<span>
						<Trans>to</Trans>
					</span>
					<Input
						type="number"
						value={question.max ?? 5}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							onUpdate({ max: Number(e.target.value) })
						}
						className="w-20"
						aria-label={t`Maximum rating`}
					/>
				</div>
			</div>
		) : null;

	const settingsSection = (
		<div>
			<label htmlFor={pageId} className="mb-2 block text-sm font-medium">
				<Trans>Page</Trans>
			</label>
			<Input
				id={pageId}
				type="number"
				value={question.page}
				min={1}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					onUpdate({ page: Math.max(1, Number(e.target.value)) })
				}
			/>
			<Button
				variant="outline"
				className="mt-4 w-full"
				onClick={onAddCondition}
			>
				<Trans>Add Conditional Logic</Trans>
			</Button>
		</div>
	);

	const items = [
		{ id: "question", title: <Trans>Question</Trans>, content: questionSection },
		...(optionsSection
			? [{ id: "options", title: <Trans>Options</Trans>, content: optionsSection }]
			: []),
		...(ratingSection
			? [{ id: "rating", title: <Trans>Rating</Trans>, content: ratingSection }]
			: []),
		{ id: "settings", title: <Trans>Settings</Trans>, content: settingsSection },
	];

	return (
		<div className="w-80 overflow-y-auto border-l border-border bg-background p-6">
			<Accordion items={items} defaultOpen={["question", "settings"]} />
		</div>
	);
}
