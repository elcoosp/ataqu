"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

const APPS = [
  { id: "cinq", name: "CINQ", desc: "CRM" },
  { id: "pivot", name: "PIVOT", desc: "Docs & databases" },
  { id: "dial", name: "DIAL", desc: "Chat & support" },
  { id: "spark", name: "SPARK", desc: "Automation" },
  { id: "tempo", name: "TEMPO", desc: "Scheduling" },
  { id: "sond", name: "SOND", desc: "Forms & surveys" },
  { id: "vault", name: "VAULT", desc: "Inventory" },
  { id: "pause", name: "PAUSE", desc: "HR & leave" },
  { id: "aegis", name: "AEGIS", desc: "SSO & security" },
  { id: "vista", name: "VISTA", desc: "Analytics & BI" },
];

export function AppGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
      {APPS.map((app) => (
        <Link key={app.id} href={`/apps/${app.id}`} className="block w-full max-w-[120px]">
          <AppCard app={app} />
        </Link>
      ))}
    </div>
  );
}

function AppCard({ app }: { app: { id: string; name: string; desc: string } }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center p-4 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-colors w-full h-full">
      <div className="w-14 h-14 rounded-full overflow-hidden mb-2 border border-primary/20 flex items-center justify-center bg-background">
        {!imgError ? (
          <Image
            src={`/apps/${app.id}.png`}
            alt={app.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-primary font-display text-lg font-bold">{app.name.charAt(0)}</span>
        )}
      </div>
      <span className="font-display text-sm font-semibold text-center">{app.name}</span>
      <span className="text-xs text-muted-foreground mt-1 text-center">{app.desc}</span>
    </div>
  );
}
