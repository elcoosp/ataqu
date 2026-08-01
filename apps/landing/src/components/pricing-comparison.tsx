"use client";

import { Trans } from "@lingui/react/macro";

const ROWS = [
  { name: "HubSpot", price: "$1,200/mo", contract: "3‑year lock‑in", note: "+ $200/mo for reporting", highlight: false },
  { name: "Slack", price: "$15/user/mo", contract: "Monthly", note: "30% price hike", highlight: false },
  { name: "Zapier", price: "$79/mo", contract: "Monthly", note: "750 tasks/mo limit", highlight: false },
  { name: "Ataqu", price: "$49/mo", contract: "Month‑to‑month", note: "Everything included", highlight: true },
];

export function PricingComparison() {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="block md:hidden space-y-4">
        {ROWS.map((row) => (
          <div
            key={row.name}
            className={`p-4 rounded-lg border ${row.highlight ? "border-primary bg-primary/5" : "border-border bg-card/30"}`}
          >
            <div className="flex justify-between items-start">
              <span className={`font-display text-lg ${row.highlight ? "text-primary font-bold" : "text-foreground"}`}>
                {row.name}
              </span>
              <span className={`font-mono text-lg ${row.highlight ? "text-primary" : "text-foreground"}`}>
                {row.price}
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <span>{row.contract}</span>
              <span className="mx-2">·</span>
              <span>{row.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                <Trans>Tool</Trans>
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                <Trans>Monthly Cost</Trans>
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                <Trans>Contract</Trans>
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                <Trans>Notes</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.name}
                className={`border-b border-border/50 ${row.highlight ? "bg-primary/5" : ""}`}
              >
                <td className={`py-3 px-4 font-display text-sm ${row.highlight ? "text-primary font-bold" : "text-foreground"}`}>
                  {row.name}
                </td>
                <td className={`py-3 px-4 font-mono text-sm ${row.highlight ? "text-primary" : "text-foreground"}`}>
                  {row.price}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{row.contract}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
