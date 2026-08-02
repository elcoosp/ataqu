"use client";

import { useState, useEffect, useRef } from "react";
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
  {
    id: "pivot",
    label: "Docs & databases",
    description: "PIVOT — like Notion but faster"
  },
  {
    id: "dial",
    label: "Chat & support",
    description: "DIAL — Slack + Intercom unified"
  },
  {
    id: "spark",
    label: "Automation",
    description: "SPARK — Zapier without limits"
  },
  {
    id: "tempo",
    label: "Scheduling",
    description: "TEMPO — Calendly built in"
  },
  {
    id: "sond",
    label: "Forms & surveys",
    description: "SOND — Typeform without limits"
  },
  {
    id: "cinq",
    label: "CRM & sales",
    description: "CINQ — HubSpot at 1/10th price"
  },
  {
    id: "vault",
    label: "Inventory",
    description: "VAULT — Cin7 without lock‑in"
  },
  {
    id: "pause",
    label: "HR & leave",
    description: "PAUSE — Personio simplified"
  },
  {
    id: "aegis",
    label: "SSO & security",
    description: "AEGIS — Okta for $3/mo"
  },
  {
    id: "vista",
    label: "Analytics & BI",
    description: "VISTA — Tableau without ETL"
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
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { apps: [] },
  });

  const selectedApps = watch("apps") || [];

  // Apply preselected apps when they change, but only once
  useEffect(() => {
    if (preselectedApps && preselectedApps.length > 0 && !preselectApplied.current) {
      setValue("apps", preselectedApps);
      preselectApplied.current = true;
    }
  }, [preselectedApps, setValue]);

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
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            <div key={app.id} className="relative group">
              <button
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
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-card border border-border rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {app.description}
              </div>
            </div>
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
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
          className="mt-1 w-full rounded-md border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
          placeholder={i18n._(t`CEO, CTO, Head of Ops…`)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {i18n._(t`Submitting…`)}
          </>
        ) : i18n._(t`Join the waitlist`)}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        <Trans>No credit card required. Early access only.</Trans>
      </p>
    </form>
  );
}
