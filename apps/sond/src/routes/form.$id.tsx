import {
	type AnswerInput,
	type AnswerValue,
	useGetForm,
	useSubmitForm,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import { Bone, Button, Input } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SondQuestion } from "../components/builder/types";
import { isQuestionVisible } from "../components/preview/visibility";

// Cast the route path to bypass routeTree.gen.ts strict typing for new routes
// that haven't been picked up by the TanStack Router plugin yet.
export const Route = createFileRoute("/form/$id")({
	component: PublicFormRoute,
});

function PublicFormRoute() {
	const { id } = Route.useParams() as { id: string };
	const { data: form, isLoading } = useGetForm(id, {
		queryKey: ["sond", "public-form", id],
	});
	const [answers, setAnswers] = useState<Record<string, unknown>>({});
	const [currentSlide, setCurrentSlide] = useState(0);
	const [submitted, setSubmitted] = useState(false);

	const submitMutation = useSubmitForm({
		onSuccess: () => {
			setSubmitted(true);
			toast.success(t`Response submitted successfully`);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	// Map FormQuestion from api-client to SondQuestion (adds required 'page' field)
	const sondQuestions = useMemo(
		() =>
			form
				? (form.questions.map((q) => ({ ...q, page: 1 })) as SondQuestion[])
				: [],
		[form],
	);

	const visibleQuestions = useMemo(
		() => sondQuestions.filter((q) => isQuestionVisible(q, answers)),
		[sondQuestions, answers],
	);

	const setAnswer = useCallback((questionId: string, value: unknown) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	}, []);

	const handleSubmit = useCallback(() => {
		if (!form) return;
		const answerInputs: AnswerInput[] = visibleQuestions.map((q) => {
			const rawValue = answers[q.id];
			let value: AnswerValue;
			switch (q.type) {
				case "text":
				case "email":
				case "phone":
					value = { type: q.type, value: String(rawValue ?? "") };
					break;
				case "number":
				case "rating":
					value = { type: q.type, value: Number(rawValue ?? 0) };
					break;
				case "date":
					value = { type: "date", value: String(rawValue ?? "") };
					break;
				case "choice":
					value = { type: "choice", value: String(rawValue ?? "") };
					break;
				case "multiple_choice":
					value = {
						type: "multiple_choice",
						value: Array.isArray(rawValue) ? rawValue : [],
					};
					break;
				default:
					value = { type: "text", value: String(rawValue ?? "") };
			}
			return { question_id: q.id, value };
		});
		submitMutation.mutate({ formId: id, data: { answers: answerInputs } });
	}, [form, visibleQuestions, answers, id, submitMutation]);

	const handleNext = useCallback(() => {
		const currentQ = visibleQuestions[currentSlide];
		if (!currentQ) return;
		const value = answers[currentQ.id];
		if (currentQ.required && (value == null || String(value).trim() === "")) {
			toast.error(t`This field is required`);
			return;
		}
		if (currentSlide < visibleQuestions.length - 1) {
			setCurrentSlide(currentSlide + 1);
		} else {
			handleSubmit();
		}
	}, [currentSlide, visibleQuestions, answers, handleSubmit]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="w-full max-w-lg space-y-4 p-8">
					<Bone
						loading
						name="form-$id-1"
						fallback={<div className="h-8 w-48" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="form-$id-2"
						fallback={<div className="h-12 w-full" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="form-$id-3"
						fallback={<div className="h-12 w-full" />}
					>
						{null}
					</Bone>
				</div>
			</div>
		);
	}

	if (!form) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">
						<Trans>Form not found</Trans>
					</h1>
					<p className="text-muted-foreground">
						<Trans>This form does not exist or has been removed.</Trans>
					</p>
				</div>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center animate-in fade-in zoom-in duration-300">
					<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mx-auto">
						<svg
							className="h-8 w-8 text-primary"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold mb-2">
						<Trans>Thank you!</Trans>
					</h1>
					<p className="text-muted-foreground" role="status" aria-live="polite">
						<Trans>Your response has been recorded.</Trans>
					</p>
				</div>
			</div>
		);
	}

	const currentQuestion = visibleQuestions[currentSlide];
	if (!currentQuestion) return null;

	const isConversational = form.mode === "conversational";

	const renderInput = (q: SondQuestion) => {
		const value = answers[q.id];
		switch (q.type) {
			case "text":
			case "email":
			case "phone":
				return (
					<Input
						type={
							q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"
						}
						value={typeof value === "string" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setAnswer(q.id, e.target.value)
						}
						className="h-12 text-lg"
						autoFocus
						aria-label={q.label}
					/>
				);
			case "number":
			case "rating":
				return (
					<Input
						type="number"
						value={typeof value === "number" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setAnswer(
								q.id,
								e.target.value === "" ? "" : Number(e.target.value),
							)
						}
						className="h-12 text-lg"
						autoFocus
						aria-label={q.label}
					/>
				);
			case "date":
				return (
					<Input
						type="date"
						value={typeof value === "string" ? value : ""}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setAnswer(q.id, e.target.value)
						}
						className="h-12 text-lg"
						autoFocus
						aria-label={q.label}
					/>
				);
			case "choice":
				return (
					<div className="space-y-3" role="radiogroup" aria-label={q.label}>
						{(q.options || []).map((opt) => (
							<label
								key={opt}
								className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
							>
								<input
									type="radio"
									name={`question-${q.id}`}
									value={opt}
									checked={value === opt}
									onChange={() => setAnswer(q.id, opt)}
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
					<div className="space-y-3" role="group" aria-label={q.label}>
						{(q.options || []).map((opt) => (
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
										setAnswer(q.id, next);
									}}
									className="h-4 w-4"
								/>
								<span>{opt}</span>
							</label>
						))}
					</div>
				);
			}
			default:
				return null;
		}
	};

	if (isConversational) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg">
					<div className="mb-2 text-sm text-muted-foreground">
						<Trans>
							Question {currentSlide + 1} of {visibleQuestions.length}
						</Trans>
					</div>
					<div
						className="mb-8 h-1.5 w-full rounded-full bg-muted"
						role="progressbar"
						aria-valuenow={currentSlide + 1}
						aria-valuemin={1}
						aria-valuemax={visibleQuestions.length}
					>
						<div
							className="h-1.5 rounded-full bg-primary transition-all"
							style={{
								width: `${((currentSlide + 1) / visibleQuestions.length) * 100}%`,
							}}
						/>
					</div>
					<h2 className="mb-6 text-2xl font-bold">{currentQuestion.label}</h2>
					{renderInput(currentQuestion)}
					<Button
						onClick={handleNext}
						disabled={submitMutation.isPending}
						className="mt-8 h-12 w-full bg-primary text-lg text-primary-foreground hover:bg-primary/90"
					>
						{submitMutation.isPending ? (
							<Bone
								loading
								name="form-$id-4"
								fallback={<div className="h-5 w-20" />}
							>
								{null}
							</Bone>
						) : currentSlide === visibleQuestions.length - 1 ? (
							<Trans>Submit</Trans>
						) : (
							<Trans>Next</Trans>
						)}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-2xl rounded-xl border border-border bg-card p-8 shadow-lg">
				<h1 className="mb-6 text-3xl font-bold">{form.title}</h1>
				{form.description && (
					<p className="mb-8 text-muted-foreground">{form.description}</p>
				)}
				<div className="space-y-6">
					{visibleQuestions.map((q) => (
						<div key={q.id}>
							<label className="mb-2 block text-sm font-medium">
								{q.label}{" "}
								{q.required && <span className="text-destructive">*</span>}
							</label>
							{renderInput(q)}
						</div>
					))}
				</div>
				<Button
					onClick={handleSubmit}
					disabled={submitMutation.isPending}
					className="mt-8 h-12 w-full bg-primary text-lg text-primary-foreground hover:bg-primary/90"
				>
					{submitMutation.isPending ? (
						<Trans>Submitting...</Trans>
					) : (
						<Trans>Submit</Trans>
					)}
				</Button>
			</div>
		</div>
	);
}
