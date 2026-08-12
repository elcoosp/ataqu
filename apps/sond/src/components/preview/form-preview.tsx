import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";
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

	const handleClose = () => {
		reset();
		setSubmitted(false);
		onClose();
	};

	const handleSubmit = () => setSubmitted(true);

	const handleNextPage = () => {
		if (currentSlide < totalPages - 1) setCurrentSlide(currentSlide + 1);
		else handleSubmit();
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
							onChange={(e) => setAnswer(q.id, e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					) : q.type === "number" ? (
						<input
							type="number"
							value={
								typeof answers[q.id] === "number"
									? (answers[q.id] as number)
									: ""
							}
							onChange={(e) =>
								setAnswer(
									q.id,
									e.target.value === "" ? "" : Number(e.target.value),
								)
							}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					) : q.type === "date" ? (
						<input
							type="date"
							value={
								typeof answers[q.id] === "string"
									? (answers[q.id] as string)
									: ""
							}
							onChange={(e) => setAnswer(q.id, e.target.value)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					) : q.type === "choice" ? (
						<div className="space-y-2">
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
						<div className="space-y-2">
							{(q.options || []).map((opt) => {
								const arr = Array.isArray(answers[q.id])
									? (answers[q.id] as string[])
									: [];
								return (
									<label key={opt} className="flex items-center gap-2">
										<input
											type="checkbox"
											checked={arr.includes(opt)}
											onChange={(e) => {
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
						<div className="flex gap-2">
							{Array.from(
								{ length: (q.max ?? 5) - (q.min ?? 1) + 1 },
								(_, i) => (q.min ?? 1) + i,
							).map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setAnswer(q.id, n)}
									className={`h-10 w-10 rounded-lg border ${answers[q.id] === n ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
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
				<Button onClick={handleNextPage}>
					{currentSlide === totalPages - 1 ? (
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
							<p className="text-muted-foreground">
								<Trans>Your response has been recorded.</Trans>
							</p>
						</div>
					) : mode === "conversational" && conversationalQuestion ? (
						<ConversationalSlide
							question={conversationalQuestion}
							value={answers[conversationalQuestion.id]}
							onChange={(v) => setAnswer(conversationalQuestion.id, v)}
							onNext={() => setCurrentSlide(currentSlide + 1)}
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
