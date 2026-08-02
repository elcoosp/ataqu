"use client";


const ROWS = [
  { name: "HubSpot", price: "$1,200/mo", contract: "3‑year lock‑in", note: "Professional tier", highlight: false },
  { name: "Slack", price: "$12.50/user/mo", contract: "Monthly", note: "30% price hike", highlight: false },
  { name: "Zapier", price: "$79/mo", contract: "Monthly", note: "2,000 tasks/mo", highlight: false },
  { name: "Ataqu", price: "$79/mo", contract: "Month‑to‑month", note: "10 apps included", highlight: true },
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
                Tool
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                Monthly Cost
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                Contract
              </th>
              <th className="text-left py-3 px-4 text-sm font-display text-muted-foreground">
                Notes
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
