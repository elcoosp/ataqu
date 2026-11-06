"use client";

import { LoadingButton } from "@ataqu/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { checkmarkDraw } from "@/lib/animations";

const schema = z.object({
	email: z.string().email("Please enter a valid email address"),
	apps: z.array(z.string()).min(1, "Select at least one app"),
	name: z.string().optional(),
	role: z.string().optional(),
	companySize: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const APP_OPTIONS = [
	{
		id: "pivot",
		label: "Docs & databases",
		description: "PIVOT — like Notion but faster",
	},
	{
		id: "dial",
		label: "Chat & support",
		description: "DIAL — Slack + Intercom unified",
	},
	{
		id: "spark",
		label: "Automation",
		description: "SPARK — Zapier without limits",
	},
	{
		id: "tempo",
		label: "Scheduling",
		description: "TEMPO — Calendly built in",
	},
	{
		id: "sond",
		label: "Forms & surveys",
		description: "SOND — Typeform without limits",
	},
	{
		id: "cinq",
		label: "CRM & sales",
		description: "CINQ — HubSpot at 1/10th price",
	},
	{
		id: "vault",
		label: "Inventory",
		description: "VAULT — Cin7 without lock‑in",
	},
	{
		id: "pause",
		label: "HR & leave",
		description: "PAUSE — Personio simplified",
	},
	{
		id: "aegis",
		label: "SSO & security",
		description: "AEGIS — Okta for $3/mo",
	},
	{
		id: "vista",
		label: "Analytics & BI",
		description: "VISTA — Tableau without ETL",
	},
];

interface WaitlistFormProps {
	preselectedApps?: string[];
}

export function WaitlistForm({ preselectedApps = [] }: WaitlistFormProps) {
	const { i18n } = useLingui();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);
	const preselectApplied = useRef(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<FormData>({
		resolver: zodResolver(schema as never),
		defaultValues: { email: "", apps: [], name: "", role: "", companySize: "" },
	});

	const selectedApps = watch("apps") || [];

	useEffect(() => {
		if (
			preselectedApps &&
			preselectedApps.length > 0 &&
			!preselectApplied.current
		) {
			setValue("apps", preselectedApps);
			preselectApplied.current = true;
		}
	}, [preselectedApps, setValue]);

	const toggleApp = (id: string) => {
		const current = selectedApps;
		if (current.includes(id)) {
			setValue(
				"apps",
				current.filter((a) => a !== id),
			);
		} else {
			setValue("apps", [...current, id]);
		}
	};

	const onSubmit = async (data: FormData) => {
		setIsSubmitting(true);
		try {
			const res = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (res.ok) {
				setSuccess(true);
			} else {
				alert(i18n._(t`Something went wrong. Please try again.`));
				setIsSubmitting(false);
			}
		} catch {
			alert(i18n._(t`Network error. Please check your connection.`));
			setIsSubmitting(false);
		}
	};

	if (success) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				className="border border-stamp/40 bg-paper p-6 text-center"
			>
				<svg
					width="64"
					height="64"
					viewBox="0 0 64 64"
					className="mx-auto mb-4"
					aria-hidden="true"
				>
					<circle
						cx="32"
						cy="32"
						r="30"
						fill="none"
						stroke="var(--color-stamp)"
						strokeWidth="2.5"
					/>
					<motion.path
						d="M18 32 L28 42 L46 22"
						fill="none"
						stroke="var(--color-stamp)"
						strokeWidth="4"
						strokeLinecap="round"
						strokeLinejoin="round"
						initial="hidden"
						animate="visible"
						variants={checkmarkDraw}
					/>
				</svg>
				<h3 className="display text-xl text-ink-strong">
					<Trans>You're on the list</Trans>
				</h3>
				<p className="mt-2 text-ink-soft">
					<Trans>We'll send you early access and exclusive updates.</Trans>
				</p>
			</motion.div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="max-w-md space-y-5 text-left"
		>
			<div>
				<label htmlFor="email" className="meta mb-1.5 block text-ink-soft">
					<Trans>Email address</Trans>
				</label>
				<input
					id="email"
					type="email"
					{...register("email")}
					className="field"
					placeholder={i18n._(t`you@company.com`)}
				/>
				<AnimatePresence>
					{errors.email && (
						<motion.p
							initial={{ opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							className="mt-1.5 text-sm text-reject"
						>
							{errors.email.message}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			<fieldset>
				<legend className="meta mb-2 text-ink-soft">
					<Trans>Which apps interest you?</Trans>
				</legend>
				<div className="flex flex-wrap gap-2">
					{APP_OPTIONS.map((app) => (
						<div key={app.id} className="group relative">
							<button
								type="button"
								onClick={() => toggleApp(app.id)}
								aria-pressed={selectedApps.includes(app.id)}
								className={`rounded-[2px] border px-2.5 py-1 text-sm transition-colors ${
									selectedApps.includes(app.id)
										? "border-redline-ink bg-redline/10 font-medium text-redline-ink"
										: "border-hairline-strong text-ink-soft hover:border-ink hover:text-ink"
								}`}
							>
								{app.label}
							</button>
							<div
								role="tooltip"
								className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-[2px] border border-ink-strong bg-ink-strong px-2 py-1 text-xs text-paper opacity-0 shadow-[0_2px_8px_rgba(20,23,28,0.25)] transition-opacity duration-150 group-hover:opacity-100"
							>
								{app.description}
							</div>
						</div>
					))}
				</div>
				<AnimatePresence>
					{errors.apps && (
						<motion.p
							initial={{ opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							className="mt-1.5 text-sm text-reject"
						>
							{errors.apps.message}
						</motion.p>
					)}
				</AnimatePresence>
			</fieldset>

			<div>
				<label htmlFor="name" className="meta mb-1.5 block text-ink-soft">
					<Trans>Name (optional)</Trans>
				</label>
				<input
					id="name"
					type="text"
					{...register("name")}
					className="field"
					placeholder={i18n._(t`Your name`)}
				/>
			</div>

			<div>
				<label htmlFor="role" className="meta mb-1.5 block text-ink-soft">
					<Trans>Role (optional)</Trans>
				</label>
				<input
					id="role"
					type="text"
					{...register("role")}
					className="field"
					placeholder={i18n._(t`CEO, CTO, Head of Ops…`)}
				/>
			</div>

			<LoadingButton
				onAction={() => handleSubmit(onSubmit)()}
				disabled={isSubmitting}
				pendingLabel={i18n._(t`Submitting…`)}
				className="btn btn-primary w-full"
			>
				{i18n._(t`Join the waitlist`)}
			</LoadingButton>

			<p className="meta text-center text-ink-soft">
				<Trans>No credit card required. Early access only.</Trans>
			</p>
		</form>
	);
}
