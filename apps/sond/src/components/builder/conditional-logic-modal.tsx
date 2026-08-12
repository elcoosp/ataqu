import type { FormQuestion } from "@ataqu/api-client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { useEffect, useState } from "react";
import type { SondQuestion } from "./types";

type ConditionOperator = NonNullable<
	FormQuestion["conditions"]
>[number]["operator"];

interface Props {
	open: boolean;
	question: SondQuestion | null;
	questions: SondQuestion[];
	onSave: (condition: NonNullable<SondQuestion["conditions"]>[number]) => void;
	onClose: () => void;
}

export function ConditionalLogicModal({
	open,
	question,
	questions,
	onSave,
	onClose,
}: Props) {
	const [conditionQuestionId, setConditionQuestionId] = useState("");
	const [operator, setOperator] = useState<ConditionOperator>("equals");
	const [value, setValue] = useState("");

	useEffect(() => {
		if (open && question?.conditions && question.conditions.length > 0) {
			const c = question.conditions[0];
			if (c) {
				setConditionQuestionId(c.question_id);
				setOperator(c.operator);
				setValue(String(c.value ?? ""));
			}
		} else {
			setConditionQuestionId("");
			setOperator("equals");
			setValue("");
		}
	}, [open, question]);

	const availableQuestions = questions.filter((q) => q.id !== question?.id);
	const disableValue = operator === "is_empty" || operator === "is_not_empty";

	const handleSave = () => {
		if (!conditionQuestionId) return;
		onSave({
			question_id: conditionQuestionId,
			operator,
			value,
		});
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="ataqu-glass">
				<DialogHeader>
					<DialogTitle>
						<Trans>Add Conditional Logic</Trans>
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">
							<Trans>If</Trans>
						</span>
						<Select
							value={conditionQuestionId}
							onValueChange={setConditionQuestionId}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder={t`Question`} />
							</SelectTrigger>
							<SelectContent>
								{availableQuestions.map((q) => (
									<SelectItem key={q.id} value={q.id}>
										{q.label || t`Untitled`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={operator}
							onValueChange={(v) => setOperator(v as ConditionOperator)}
						>
							<SelectTrigger className="w-32">
								<SelectValue placeholder={t`Operator`} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="equals">
									<Trans>equals</Trans>
								</SelectItem>
								<SelectItem value="not_equals">
									<Trans>not equals</Trans>
								</SelectItem>
								<SelectItem value="contains">
									<Trans>contains</Trans>
								</SelectItem>
								<SelectItem value="not_contains">
									<Trans>not contains</Trans>
								</SelectItem>
								<SelectItem value="is_empty">
									<Trans>is empty</Trans>
								</SelectItem>
								<SelectItem value="is_not_empty">
									<Trans>is not empty</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
						{!disableValue && (
							<Input
								value={value}
								onChange={(e) => setValue(e.target.value)}
								className="w-40"
								placeholder={t`Value`}
							/>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						<Trans>
							This question will be shown only when the condition above is met.
						</Trans>
					</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleSave}>
						<Trans>Save Logic</Trans>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
