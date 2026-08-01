"use client";

import { Trans } from "@lingui/react/macro";

const PHASES = [
  {
    name: "Phase 1: Foundation & Revenue",
    tasks: [
      { name: "AEGIS (SSO, MFA, Auth)", status: "done" },
      { name: "CINQ (CRM, Pipeline)", status: "done" },
      { name: "VAULT (Inventory)", status: "done" },
      { name: "SOND (Forms)", status: "done" },
      { name: "PIVOT (Docs & Databases)", status: "done" },
    ],
  },
  {
    name: "Phase 2: Collaboration & Real‑time",
    tasks: [
      { name: "DIAL (Chat & Support)", status: "in-progress" },
      { name: "SPARK (Automation)", status: "in-progress" },
      { name: "TEMPO (Scheduling)", status: "planned" },
      { name: "PAUSE (HR & Leave)", status: "planned" },
      { name: "VISTA (Analytics & BI)", status: "planned" },
    ],
  },
  {
    name: "Phase 3: Polish & Launch",
    tasks: [
      { name: "GDPR Compliance", status: "planned" },
      { name: "Load Testing (k6)", status: "planned" },
      { name: "CI/CD Pipeline", status: "planned" },
      { name: "Documentation & Runbooks", status: "planned" },
      { name: "Public Launch", status: "planned" },
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  const colors = {
    done: "bg-success/20 text-success border-success/30",
    "in-progress": "bg-primary/20 text-primary border-primary/30",
    planned: "bg-muted/20 text-muted-foreground border-muted/30",
  };
  const labels = {
    done: "Done",
    "in-progress": "In Progress",
    planned: "Planned",
  };
  const color = colors[status as keyof typeof colors] || colors.planned;
  const label = labels[status as keyof typeof labels] || labels.planned;
  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default function RoadmapPage() {
  return (
    <div className="container section-padding">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-center">
        <Trans>Public Roadmap</Trans>
      </h1>
      <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
        <Trans>We're building the Unified SMB OS in the open. Here's what's done, what's next, and what's planned.</Trans>
      </p>
      <div className="mt-12 space-y-12 max-w-3xl mx-auto">
        {PHASES.map((phase, idx) => (
          <div key={idx} className="border-l-2 border-border pl-6">
            <h2 className="font-display text-2xl font-bold text-foreground">{phase.name}</h2>
            <ul className="mt-4 space-y-3">
              {phase.tasks.map((task, tIdx) => (
                <li key={tIdx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-foreground">{task.name}</span>
                  <StatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-12 text-center text-sm text-muted-foreground">
        <Trans>This roadmap is updated as we ship. Follow our progress on GitHub.</Trans>
      </p>
    </div>
  );
}
