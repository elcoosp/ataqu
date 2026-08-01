"use client";

import { useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  apps: z.array(z.string()).min(1, "Select at least one app"),
  name: z.string().optional(),
  role: z.string().optional(),
  companySize: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const APP_OPTIONS = [
  { id: "pivot", label: "PIVOT" },
  { id: "dial", label: "DIAL" },
  { id: "spark", label: "SPARK" },
  { id: "tempo", label: "TEMPO" },
  { id: "sond", label: "SOND" },
  { id: "cinq", label: "CINQ" },
  { id: "vault", label: "VAULT" },
  { id: "pause", label: "PAUSE" },
  { id: "aegis", label: "AEGIS" },
  { id: "vista", label: "VISTA" },
];

export function WaitlistForm() {
  const { i18n } = useLingui();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { apps: [] },
  });

  const selectedApps = watch("apps") || [];

  const toggleApp = (id: string) => {
    const current = selectedApps;
    if (current.includes(id)) {
      setValue("apps", current.filter((a) => a !== id));
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
      }
    } catch {
      alert(i18n._(t`Network error. Please check your connection.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 rounded-lg border border-primary/30 bg-card/50 text-center">
        <h3 className="text-xl font-display text-primary">
          <Trans>You're on the list!</Trans>
        </h3>
        <p className="mt-2 text-muted-foreground">
          <Trans>We'll send you early access and exclusive updates.</Trans>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4 text-left">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          <Trans>Email address</Trans>
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/50"
          placeholder={i18n._(t`you@company.com`)}
        />
        {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
      </div>

      <div>
        <span className="block text-sm font-medium">
          <Trans>Which apps interest you?</Trans>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {APP_OPTIONS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => toggleApp(app.id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                selectedApps.includes(app.id)
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {app.label}
            </button>
          ))}
        </div>
        {errors.apps && <p className="mt-1 text-sm text-error">{errors.apps.message}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          <Trans>Name (optional)</Trans>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/50"
          placeholder={i18n._(t`Your name`)}
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium">
          <Trans>Role (optional)</Trans>
        </label>
        <input
          id="role"
          type="text"
          {...register("role")}
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/50"
          placeholder={i18n._(t`CEO, CTO, Head of Ops…`)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? i18n._(t`Submitting…`) : i18n._(t`Join the waitlist`)}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        <Trans>No credit card required. Early access only.</Trans>
      </p>
    </form>
  );
}
