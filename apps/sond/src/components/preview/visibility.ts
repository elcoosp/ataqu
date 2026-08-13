import type { SondQuestion } from "../builder/types";

export function isQuestionVisible(
	question: SondQuestion,
	answers: Record<string, unknown>,
): boolean {
	if (!question.conditions || question.conditions.length === 0) return true;
	return question.conditions.every((cond) => {
		const answerValue = answers[cond.question_id];
		const condValue = cond.value;
		switch (cond.operator) {
			case "equals":
				return String(answerValue ?? "") === String(condValue ?? "");
			case "not_equals":
				return String(answerValue ?? "") !== String(condValue ?? "");
			case "contains":
				return String(answerValue ?? "").includes(String(condValue ?? ""));
			case "not_contains":
				return !String(answerValue ?? "").includes(String(condValue ?? ""));
			case "is_empty":
				return answerValue == null || String(answerValue).trim() === "";
			case "is_not_empty":
				return answerValue != null && String(answerValue).trim() !== "";
			case "greater_than": {
				const a = Number(answerValue);
				const c = Number(condValue);
				return !Number.isNaN(a) && !Number.isNaN(c) && a > c;
			}
			case "less_than": {
				const a = Number(answerValue);
				const c = Number(condValue);
				return !Number.isNaN(a) && !Number.isNaN(c) && a < c;
			}
			default:
				return true;
		}
	});
}
