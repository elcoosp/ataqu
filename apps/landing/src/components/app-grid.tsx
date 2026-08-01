"use client";

import {
  Database,
  MessageSquare,
  Zap,
  Calendar,
  FileText,
  Package,
  Users,
  Shield,
  BarChart3,
  FormInput,
} from "lucide-react";

const APPS = [
  { id: "pivot", name: "PIVOT", desc: "Docs & databases", icon: Database },
  { id: "dial", name: "DIAL", desc: "Chat & support", icon: MessageSquare },
  { id: "spark", name: "SPARK", desc: "Automation", icon: Zap },
  { id: "tempo", name: "TEMPO", desc: "Scheduling", icon: Calendar },
  { id: "sond", name: "SOND", desc: "Forms & surveys", icon: FormInput },
  { id: "cinq", name: "CINQ", desc: "CRM", icon: FileText },
  { id: "vault", name: "VAULT", desc: "Inventory", icon: Package },
  { id: "pause", name: "PAUSE", desc: "HR & leave", icon: Users },
  { id: "aegis", name: "AEGIS", desc: "SSO & security", icon: Shield },
  { id: "vista", name: "VISTA", desc: "Analytics & BI", icon: BarChart3 },
];

export function AppGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {APPS.map((app) => {
        const Icon = app.icon;
        return (
          <div
            key={app.id}
            className="flex flex-col items-center p-4 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-colors"
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary mb-2">
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-display text-sm font-semibold">{app.name}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{app.desc}</span>
          </div>
        );
      })}
    </div>
  );
}
