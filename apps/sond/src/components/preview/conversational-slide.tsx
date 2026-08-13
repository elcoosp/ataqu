import type { AnswerValue } from "@ataqu/api-client";
import { useSubmitConversationalStep } from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Button, Input, Skeleton } from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { useState } from "react";
import { toast } from "sonner";
import type { SondQuestion } from "../builder/types";

interface Props {
	formId: string;
	question: SondQuestion;
	value: unknown;
	onChange: (val: unknown) => void;
	onNext: (nextQuestionId?: string) => void;
	onSubmit: () => void;
	isLast: boolean;
	total: number;
	current: number;
}

function toAnswerValue(type: string, value: unknown): AnswerValue {
	switch (type) {
		case "text":
		case "email":
		case "phone":
			return {
				type: type as "text" | "email" | "phone",
				value: String(value ?? ""),
			};
		case "number":
			return { type: "number", value: Number(value ?? 0) };
		case "date":
			return { type: "date", value: String(value ?? "") };
		case "choice":
			return { type: "choice", value: String(value ?? "") };
		case "multiple_choice":
			return {
				type: "multiple_choice",
				value: Array.isArray(value) ? value : [],
			};
		case "rating":
			return { type: "rating", value: Number(value ?? 0) };
		default:
			return { type: "text", value: String(value ?? "") };
	}
}

export function ConversationalSlide({
	formId,
	question,
	value,
	onChange,
	onNext,
	onSubmit,
	isLast,
	total,
	current,
}: Props) {
	const [error, setError] = useState("");
	const stepMutation = useSubmitConversationalStep({
		onError: (err) => toast.error(handleApiError(err)),
	});

	const handleNext = () => {
		if (question.required && (value == null || String(value).trim() === "")) {
			setError(t`This field is required`);
			return;
		}
		setError("");

		const answer = {
			question_id: question.id,
			value: toAnswerValue(question.type, value),
		};

		stepMutation.mutate(
			{ formId, data: { question_id: question.id, answer } },
			{
				onSuccess: (result) => {
					if (result.is_complete) {
						onSubmit();
					} else {
						onNext(result.next_question_id);
					}
				},
			},
		);
	};

	const renderInput = () => {
		switch (question.type) {
			case "text":
			case "email":
			case "phone":
				return (
					<Input
						type={
							question.type === "email"
								? "email"
								: question.type === "phone"
									? "tel"
									: "text"
						}
						value={typeof value === "string" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
						className="h-12 text-lg"
						autoFocus
						aria-label={question.label}
					/>
				);
			case "number":
				return (
					<Input
						type="number"
						value={typeof value === "number" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							onChange(e.target.value === "" ? "" : Number(e.target.value))
						}
						className="h-12 text-lg"
						autoFocus
						aria-label={question.label}
					/>
				);
			case "date":
				return (
					<Input
						type="date"
						value={typeof value === "string" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
						className="h-12 text-lg"
						autoFocus
						aria-label={question.label}
					/>
				);
			case "choice":
				return (
					<div
						className="space-y-3"
						role="radiogroup"
						aria-label={question.label}
					>
						{(question.options || []).map((opt) => (
							<label
								key={opt}
								className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
							>
								<input
									type="radio"
									name={`question-${question.id}`}
									value={opt}
									checked={value === opt}
									onChange={() => onChange(opt)}
									className="h-4 w-4"
								/>
								<span>{opt}</span>
							</label>
						))}
					</div>
				);
			case "multiple_choice": {
				const arr = Array.isArray(value) ? (value as string[]) : [];
				return (
					<div className="space-y-3" role="group" aria-label={question.label}>
						{(question.options || []).map((opt) => (
							<label
								key={opt}
								className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
							>
								<input
									type="checkbox"
									checked={arr.includes(opt)}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
										const next = e.target.checked
											? [...arr, opt]
											: arr.filter((v) => v !== opt);
										onChange(next);
									}}
									className="h-4 w-4"
								/>
								<span>{opt}</span>
							</label>
						))}
					</div>
				);
			}
			case "rating": {
				const min = question.min ?? 1;
				const max = question.max ?? 5;
				const ratingValue = typeof value === "number" ? value : 0;
				return (
					<div
						className="flex gap-2"
						role="radiogroup"
						aria-label={question.label}
					>
						{Array.from({ length: max - min + 1 }, (_, i) => min + i).map(
							(n) => (
								<button
									key={n}
									type="button"
									onClick={() => onChange(n)}
									aria-pressed={ratingValue === n}
									className={`h-12 w-12 rounded-lg border text-lg font-medium transition-colors ${
										ratingValue === n
											? "border-primary bg-primary text-primary-foreground"
											: "border-border hover:bg-accent"
									}`}
								>
									{n}
								</button>
							),
						)}
					</div>
				);
			}
			default:
				return null;
		}
	};

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in slide-in-from-right-4 duration-150 ease-out">
			<div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg">
				<div className="mb-2 text-sm text-muted-foreground">
					<Trans>
						Question {current} of {total}
					</Trans>
				</div>
				<div
					className="mb-8 h-1.5 w-full rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={current}
					aria-valuemin={1}
					aria-valuemax={total}
				>
					<div
						className="h-1.5 rounded-full bg-primary transition-all"
						style={{ width: `${(current / total) * 100}%` }}
					/>
				</div>
				<h2 className="mb-6 text-2xl font-bold">{question.label}</h2>
				{renderInput()}
				{error && (
					<p className="mt-2 text-sm text-destructive" role="alert">
						{error}
					</p>
				)}
				<Button
					onClick={handleNext}
					disabled={stepMutation.isPending}
					className="mt-8 h-12 w-full bg-primary text-lg text-primary-foreground hover:bg-primary/90"
				>
					{stepMutation.isPending ? (
						<Skeleton className="h-5 w-20" />
					) : isLast ? (
						<Trans>Submit</Trans>
					) : (
						<Trans>Next</Trans>
					)}
				</Button>
			</div>
		</div>
	);
}
