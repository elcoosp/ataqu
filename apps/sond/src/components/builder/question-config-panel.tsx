import { Button, Input } from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
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
	if (!question) {
		return (
			<div className="flex w-80 items-center justify-center border-l border-border bg-background p-6 text-muted-foreground">
				<Trans>Select a question to configure</Trans>
			</div>
		);
	}

	const isChoiceType =
		question.type === "choice" || question.type === "multiple_choice";

	return (
		<div className="w-80 space-y-6 overflow-y-auto border-l border-border bg-background p-6">
			<div>
				<label className="mb-2 block text-sm font-medium">
					<Trans>Question Text</Trans>
				</label>
				<Input
					value={question.label}
					onChange={(e) => onUpdate({ label: e.target.value })}
					placeholder={t`e.g., What is your name?`}
				/>
			</div>

			<div className="flex items-center justify-between">
				<label className="text-sm font-medium">
					<Trans>Required</Trans>
				</label>
				<Switch
					checked={question.required}
					onCheckedChange={(checked: boolean) =>
						onUpdate({ required: checked })
					}
				/>
			</div>

			{isChoiceType && (
				<div>
					<label className="mb-2 block text-sm font-medium">
						<Trans>Options</Trans>
					</label>
					<div className="space-y-2">
						{(question.options || []).map((opt, i) => (
							<Input
								key={i}
								value={opt}
								onChange={(e) => {
									const newOpts = [...(question.options || [])];
									newOpts[i] = e.target.value;
									onUpdate({ options: newOpts });
								}}
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
			)}

			{question.type === "rating" && (
				<div className="space-y-2">
					<label className="block text-sm font-medium">
						<Trans>Rating Scale</Trans>
					</label>
					<div className="flex items-center gap-2">
						<Input
							type="number"
							value={question.min ?? 1}
							onChange={(e) => onUpdate({ min: Number(e.target.value) })}
							className="w-20"
						/>
						<span>
							<Trans>to</Trans>
						</span>
						<Input
							type="number"
							value={question.max ?? 5}
							onChange={(e) => onUpdate({ max: Number(e.target.value) })}
							className="w-20"
						/>
					</div>
				</div>
			)}

			<div>
				<label className="mb-2 block text-sm font-medium">
					<Trans>Page</Trans>
				</label>
				<Input
					type="number"
					value={question.page}
					min={1}
					onChange={(e) =>
						onUpdate({ page: Math.max(1, Number(e.target.value)) })
					}
				/>
			</div>

			<div>
				<Button variant="outline" className="w-full" onClick={onAddCondition}>
					<Trans>Add Conditional Logic</Trans>
				</Button>
			</div>
		</div>
	);
}
