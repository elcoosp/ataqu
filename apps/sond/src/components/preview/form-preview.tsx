import {
	type AnswerInput,
	type AnswerValue,
	useSubmitForm,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Skeleton,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useFormPreviewStore } from "../../stores/form-preview-store";
import type { SondForm, SondQuestion } from "../builder/types";
import { ConversationalSlide } from "./conversational-slide";
import { isQuestionVisible } from "./visibility";

interface Props {
	form: SondForm;
	open: boolean;
	onClose: () => void;
}

export function FormPreview({ form, open, onClose }: Props) {
	const { mode, currentSlide, answers, setAnswer, setCurrentSlide, reset } =
		useFormPreviewStore();
	const [submitted, setSubmitted] = useState(false);
	const triggerRef = useRef<HTMLElement | null>(null);

	const visibleQuestions = useMemo(
		() => form.questions.filter((q) => isQuestionVisible(q, answers)),
		[form.questions, answers],
	);

	const pages = useMemo(() => {
		const map = new Map<number, SondQuestion[]>();
		for (const q of visibleQuestions) {
			const arr = map.get(q.page) || [];
			arr.push(q);
			map.set(q.page, arr);
		}
		return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
	}, [visibleQuestions]);

	const totalPages = pages.length;
	const currentPageQuestions = pages[currentSlide]?.[1] || [];
	const conversationalQuestion = visibleQuestions[currentSlide];

	const submitMutation = useSubmitForm({
		onSuccess: () => {
			setSubmitted(true);
			toast.success(t`Response submitted`);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});

	useEffect(() => {
		if (open) {
			triggerRef.current = document.activeElement as HTMLElement;
		} else if (triggerRef.current) {
			triggerRef.current.focus();
			triggerRef.current = null;
		}
	}, [open]);

	const handleClose = () => {
		reset();
		setSubmitted(false);
		onClose();
	};

	const handleSubmit = () => {
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
		submitMutation.mutate({ formId: form.id, data: { answers: answerInputs } });
	};

	const handleNextPage = () => {
		if (currentSlide < totalPages - 1) setCurrentSlide(currentSlide + 1);
		else handleSubmit();
	};

	const handleConversationalNext = (nextQuestionId?: string) => {
		if (nextQuestionId) {
			const idx = visibleQuestions.findIndex((q) => q.id === nextQuestionId);
			if (idx !== -1) setCurrentSlide(idx);
			else setCurrentSlide(currentSlide + 1);
		} else {
			setCurrentSlide(currentSlide + 1);
		}
	};

	const renderStandard = () => (
		<div className="mx-auto max-w-lg space-y-6">
			{currentPageQuestions.map((q) => (
				<div key={q.id}>
					<label className="mb-2 block text-sm font-medium">
						{q.label}{" "}
						{q.required && <span className="text-destructive">*</span>}
					</label>
					{q.type === "text" || q.type === "email" || q.type === "phone" ? (
						<input
							type={
								q.type === "email"
									? "email"
									: q.type === "phone"
										? "tel"
										: "text"
							}
							value={
								typeof answers[q.id] === "string"
									? (answers[q.id] as string)
									: ""
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setAnswer(q.id, e.target.value)
							}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							aria-label={q.label}
						/>
					) : q.type === "number" ? (
						<input
							type="number"
							value={
								typeof answers[q.id] === "number"
									? (answers[q.id] as number)
									: ""
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setAnswer(
									q.id,
									e.target.value === "" ? "" : Number(e.target.value),
								)
							}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							aria-label={q.label}
						/>
					) : q.type === "date" ? (
						<input
							type="date"
							value={
								typeof answers[q.id] === "string"
									? (answers[q.id] as string)
									: ""
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setAnswer(q.id, e.target.value)
							}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							aria-label={q.label}
						/>
					) : q.type === "choice" ? (
						<div className="space-y-2" role="radiogroup" aria-label={q.label}>
							{(q.options || []).map((opt) => (
								<label key={opt} className="flex items-center gap-2">
									<input
										type="radio"
										name={`preview-${q.id}`}
										checked={answers[q.id] === opt}
										onChange={() => setAnswer(q.id, opt)}
									/>
									<span>{opt}</span>
								</label>
							))}
						</div>
					) : q.type === "multiple_choice" ? (
						<div className="space-y-2" role="group" aria-label={q.label}>
							{(q.options || []).map((opt) => {
								const arr = Array.isArray(answers[q.id])
									? (answers[q.id] as string[])
									: [];
								return (
									<label key={opt} className="flex items-center gap-2">
										<input
											type="checkbox"
											checked={arr.includes(opt)}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												const next = e.target.checked
													? [...arr, opt]
													: arr.filter((v) => v !== opt);
												setAnswer(q.id, next);
											}}
										/>
										<span>{opt}</span>
									</label>
								);
							})}
						</div>
					) : q.type === "rating" ? (
						<div className="flex gap-2" role="radiogroup" aria-label={q.label}>
							{Array.from(
								{ length: (q.max ?? 5) - (q.min ?? 1) + 1 },
								(_, i) => (q.min ?? 1) + i,
							).map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setAnswer(q.id, n)}
									aria-pressed={answers[q.id] === n}
									className={`h-10 w-10 rounded-lg border ${
										answers[q.id] === n
											? "border-primary bg-primary text-primary-foreground"
											: "border-border"
									}`}
								>
									{n}
								</button>
							))}
						</div>
					) : null}
				</div>
			))}
			<div className="flex justify-between pt-4">
				{currentSlide > 0 && (
					<Button
						variant="outline"
						onClick={() => setCurrentSlide(currentSlide - 1)}
					>
						<Trans>Back</Trans>
					</Button>
				)}
				<Button onClick={handleNextPage} disabled={submitMutation.isPending}>
					{submitMutation.isPending ? (
						<Skeleton className="h-5 w-20" />
					) : currentSlide === totalPages - 1 ? (
						<Trans>Submit</Trans>
					) : (
						<Trans>Next</Trans>
					)}
				</Button>
			</div>
		</div>
	);

	if (!open) return null;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="ataqu-glass flex h-[80vh] max-w-3xl flex-col overflow-hidden p-0">
				<DialogHeader className="border-b border-border p-6">
					<DialogTitle>{form.title}</DialogTitle>
				</DialogHeader>
				<div
					className="flex-1 overflow-y-auto p-6"
					style={{
						fontFamily:
							form.branding.fontFamily === "jetbrains"
								? "JetBrains Mono, monospace"
								: "Inter, sans-serif",
					}}
				>
					{submitted ? (
						<div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
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
							<h3 className="mb-2 text-2xl font-bold">
								<Trans>Thank you!</Trans>
							</h3>
							<p
								className="text-muted-foreground"
								role="status"
								aria-live="polite"
							>
								<Trans>Your response has been recorded.</Trans>
							</p>
						</div>
					) : mode === "conversational" && conversationalQuestion ? (
						<ConversationalSlide
							formId={form.id}
							question={conversationalQuestion}
							value={answers[conversationalQuestion.id]}
							onChange={(v) => setAnswer(conversationalQuestion.id, v)}
							onNext={handleConversationalNext}
							onSubmit={handleSubmit}
							isLast={currentSlide === visibleQuestions.length - 1}
							total={visibleQuestions.length}
							current={currentSlide + 1}
						/>
					) : (
						renderStandard()
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
