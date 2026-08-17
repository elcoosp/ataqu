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
		resolver: zodResolver(schema as any),
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
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3, ease: "easeOut" }}
				className="p-6 rounded-lg border border-primary/30 bg-card/50 text-center"
			>
				<svg
					width="64"
					height="64"
					viewBox="0 0 64 64"
					className="mx-auto mb-4"
				>
					<circle
						cx="32"
						cy="32"
						r="30"
						fill="none"
						stroke="#10B981"
						strokeWidth="3"
					/>
					<motion.path
						d="M18 32 L28 42 L46 22"
						fill="none"
						stroke="#10B981"
						strokeWidth="4"
						strokeLinecap="round"
						strokeLinejoin="round"
						initial="hidden"
						animate="visible"
						variants={checkmarkDraw}
					/>
				</svg>
				<h3 className="text-xl font-display text-primary">
					<Trans>You're on the list!</Trans>
				</h3>
				<p className="mt-2 text-muted-foreground">
					<Trans>We'll send you early access and exclusive updates.</Trans>
				</p>
			</motion.div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="max-w-md mx-auto space-y-4 text-left"
		>
			<div>
				<label htmlFor="email" className="block text-sm font-medium">
					<Trans>Email address</Trans>
				</label>
				<motion.input
					id="email"
					type="email"
					{...register("email")}
					whileFocus={{
						boxShadow: "0 0 0 2px #F59E0B, 0 0 0 4px rgba(245, 158, 11, 0.15)",
					}}
					transition={{ duration: 0.15 }}
					className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground transition-shadow focus:outline-none"
					placeholder={i18n._(t`you@company.com`)}
				/>
				<AnimatePresence>
					{errors.email && (
						<motion.p
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							className="mt-1 text-sm text-error"
						>
							{errors.email.message}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			<div>
				<span className="block text-sm font-medium">
					<Trans>Which apps interest you?</Trans>
				</span>
				<div className="mt-2 flex flex-wrap gap-2">
					{APP_OPTIONS.map((app) => (
						<div key={app.id} className="relative group">
							<motion.button
								type="button"
								whileTap={{ scale: 0.93 }}
								transition={{ duration: 0.08 }}
								onClick={() => toggleApp(app.id)}
								className={`rounded-full border px-3 py-1 text-sm transition-colors ${
									selectedApps.includes(app.id)
										? "border-primary bg-primary/20 text-primary"
										: "border-border text-muted-foreground hover:border-primary/50"
								}`}
							>
								{app.label}
							</motion.button>
							<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-card border border-border rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								{app.description}
							</div>
						</div>
					))}
				</div>
				<AnimatePresence>
					{errors.apps && (
						<motion.p
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							className="mt-1 text-sm text-error"
						>
							{errors.apps.message}
						</motion.p>
					)}
				</AnimatePresence>
			</div>

			<div>
				<label htmlFor="name" className="block text-sm font-medium">
					<Trans>Name (optional)</Trans>
				</label>
				<motion.input
					id="name"
					type="text"
					{...register("name")}
					whileFocus={{
						boxShadow: "0 0 0 2px #F59E0B, 0 0 0 4px rgba(245, 158, 11, 0.15)",
					}}
					transition={{ duration: 0.15 }}
					className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground transition-shadow focus:outline-none"
					placeholder={i18n._(t`Your name`)}
				/>
			</div>

			<div>
				<label htmlFor="role" className="block text-sm font-medium">
					<Trans>Role (optional)</Trans>
				</label>
				<motion.input
					id="role"
					type="text"
					{...register("role")}
					whileFocus={{
						boxShadow: "0 0 0 2px #F59E0B, 0 0 0 4px rgba(245, 158, 11, 0.15)",
					}}
					transition={{ duration: 0.15 }}
					className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground transition-shadow focus:outline-none"
					placeholder={i18n._(t`CEO, CTO, Head of Ops…`)}
				/>
			</div>

			<LoadingButton
				onAction={() => handleSubmit(onSubmit)()}
				disabled={isSubmitting}
				pendingLabel={i18n._(t`Submitting…`)}
				className="w-full rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
			>
				Join the waitlist
			</LoadingButton>

			<p className="text-xs text-muted-foreground text-center">
				<Trans>No credit card required. Early access only.</Trans>
			</p>
		</form>
	);
}
