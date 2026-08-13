"use client";

import { Download, MessageSquare, XCircle } from "lucide-react";

export function EscapeHatch() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
			<div className="text-center p-6 rounded-lg border border-border bg-card/30">
				<div className="flex justify-center mb-2">
					<XCircle className="w-8 h-8 text-primary" strokeWidth={1.5} />
				</div>
				<h3 className="font-display text-lg font-semibold">1‑click cancel</h3>
				<p className="text-sm text-muted-foreground mt-1">
					No retention specialist. No phone call. Just click.
				</p>
			</div>
			<div className="text-center p-6 rounded-lg border border-border bg-card/30">
				<div className="flex justify-center mb-2">
					<Download className="w-8 h-8 text-primary" strokeWidth={1.5} />
				</div>
				<h3 className="font-display text-lg font-semibold">Export your data</h3>
				<p className="text-sm text-muted-foreground mt-1">
					CSV, JSON – your data belongs to you.
				</p>
			</div>
			<div className="text-center p-6 rounded-lg border border-border bg-card/30">
				<div className="flex justify-center mb-2">
					<MessageSquare className="w-8 h-8 text-primary" strokeWidth={1.5} />
				</div>
				<h3 className="font-display text-lg font-semibold">Human support</h3>
				<p className="text-sm text-muted-foreground mt-1">
					24h SLA. No bots. Real engineers.
				</p>
			</div>
		</div>
	);
}
