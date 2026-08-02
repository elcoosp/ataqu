"use client";


const PHASES = [
  {
    name: "Backend Core (Done)",
    tasks: [
      { name: "User authentication & SSO (AEGIS)", status: "done" },
      { name: "CRM (CINQ) – contacts, deals, pipeline", status: "done" },
      { name: "Inventory (VAULT) – stock & movements", status: "done" },
      { name: "Forms & surveys (SOND)", status: "done" },
      { name: "Docs & databases (PIVOT)", status: "done" },
      { name: "Team chat & support (DIAL)", status: "done" },
      { name: "Workflow automation (SPARK)", status: "done" },
      { name: "Scheduling (TEMPO)", status: "done" },
      { name: "HR & leave (PAUSE)", status: "done" },
      { name: "Analytics & dashboards (VISTA)", status: "done" },
    ],
  },
  {
    name: "Integration Layer (Done)",
    tasks: [
      { name: "Event outbox with LISTEN/NOTIFY", status: "done" },
      { name: "Idempotency & exactly-once delivery", status: "done" },
      { name: "Role-based database isolation (RLS)", status: "done" },
      { name: "Compile-time PII redaction", status: "done" },
      { name: "Generic batch ingestion", status: "done" },
    ],
  },
  {
    name: "Public Website & Brand (Done)",
    tasks: [
      { name: "Landing page & waitlist", status: "done" },
      { name: "Competitor comparison pages", status: "done" },
      { name: "Engineering blog", status: "done" },
      { name: "Public roadmap & about pages", status: "done" },
      { name: "Full i18n support", status: "done" },
    ],
  },
  {
    name: "Application Layer (In Progress)",
    tasks: [
      { name: "Application services (orchestration)", status: "in-progress" },
      { name: "API handlers (REST + WebSocket)", status: "planned" },
      { name: "Admin CLI & audit logs", status: "planned" },
      { name: "Background workers & cron", status: "planned" },
    ],
  },
  {
    name: "Frontend SPAs (Planned)",
    tasks: [
      { name: "AEGIS – Admin & SSO UI", status: "planned" },
      { name: "CINQ – CRM interface", status: "planned" },
      { name: "VAULT – Inventory dashboard", status: "planned" },
      { name: "DIAL – Chat client", status: "planned" },
      { name: "PIVOT – Docs & database UI", status: "planned" },
      { name: "All other apps (SOND, SPARK, TEMPO, PAUSE, VISTA)", status: "planned" },
    ],
  },
  {
    name: "Production Readiness (Planned)",
    tasks: [
      { name: "GDPR compliance & data privacy", status: "planned" },
      { name: "Load testing & performance tuning", status: "planned" },
      { name: "CI/CD pipeline", status: "planned" },
      { name: "Documentation & runbooks", status: "planned" },
      { name: "Public launch", status: "planned" },
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
        Public Roadmap
      </h1>
      <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
        We're building the Unified SMB OS in the open. Here's what's done, what's next, and what's planned.
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
        This roadmap is updated as we ship. Follow our progress on GitHub.
      </p>
    </div>
  );
}
