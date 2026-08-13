"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/Dialog";

interface LeadDetailProps {
	lead: any; // Will be fully typed
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function LeadDetail({ lead, open, onOpenChange }: LeadDetailProps) {
	if (!lead) return null;

	const signal = lead.signal || {};
	const score = lead.overall_lead_score || 0;
	const scoreColor =
		score >= 7
			? "text-green-600"
			: score >= 4
				? "text-yellow-600"
				: "text-red-600";

	// Client-side state for outreach status and notes
	const [status, setStatus] = React.useState("new");
	const [notes, setNotes] = React.useState("");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogHeader>
				<DialogTitle className="flex items-center justify-between">
					<span>Lead from {lead.competitor || "Unknown"}</span>
					<span className={cn("text-lg font-semibold", scoreColor)}>
						Score: {score.toFixed(1)}
					</span>
				</DialogTitle>
			</DialogHeader>
			<DialogContent>
				{/* Author and Source */}
				<div className="flex items-center gap-4 text-sm text-gray-500">
					<span>Author: {signal.author || "Anonymous"}</span>
					<span>•</span>
					<span>App: {signal.mapped_app || "N/A"}</span>
					<span>•</span>
					<a
						href={signal.source_url || "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						View Source
					</a>
				</div>

				{/* Raw Text */}
				<div>
					<h3 className="text-sm font-medium text-gray-500 mb-1">
						Original Text
					</h3>
					<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
						{signal.raw_text || "No raw text"}
					</div>
				</div>

				{/* Thread Context (if available) */}
				{signal.thread_context && signal.thread_context !== signal.raw_text && (
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Thread Context
						</h3>
						<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
							{signal.thread_context}
						</div>
					</div>
				)}

				{/* Extracted Fields */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Buyer Segment
						</h3>
						<p className="text-sm">{lead.buyer_segment || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">Workflow</h3>
						<p className="text-sm">{lead.workflow || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Current Workaround
						</h3>
						<p className="text-sm">{lead.current_workaround || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Root Cause
						</h3>
						<p className="text-sm">{lead.root_cause || "N/A"}</p>
					</div>
					<div className="col-span-2">
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Direct Quote
						</h3>
						<p className="text-sm italic">
							"{lead.direct_quote || "No quote"}"
						</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Feature Gap
						</h3>
						<p className="text-sm">{lead.feature_gap || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Pricing Complaint
						</h3>
						<p className="text-sm">{lead.pricing_complaint || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							UX Friction
						</h3>
						<p className="text-sm">{lead.ux_friction || "N/A"}</p>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Feature Impact
						</h3>
						<p className="text-sm">{lead.feature_impact || 0}/10</p>
					</div>
				</div>

				{/* Scores */}
				<div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
					<div>
						<span className="text-xs text-gray-500">Urgency</span>
						<div className="text-lg font-semibold">{lead.urgency || 0}/10</div>
					</div>
					<div>
						<span className="text-xs text-gray-500">Buying Intent</span>
						<div className="text-lg font-semibold">
							{lead.buying_intent || 0}/10
						</div>
					</div>
					<div>
						<span className="text-xs text-gray-500">Frequency</span>
						<div className="text-lg font-semibold">
							{lead.frequency || 0}/10
						</div>
					</div>
				</div>

				{/* Custom Message */}
				<div>
					<h3 className="text-sm font-medium text-gray-500 mb-1">
						Suggested Message
					</h3>
					<textarea
						className="w-full p-2 border rounded-md text-sm font-mono dark:border-gray-700 dark:bg-gray-800 h-24 resize-none"
						defaultValue={`Hey, I saw your post about ${lead.competitor || "that tool"}. We built ${signal.mapped_app || "our product"} to fix exactly that (${lead.feature_gap || "the problem you mentioned"}). Looking for beta testers. Free 1-year access. Want to chat?`}
					/>
				</div>

				{/* Outreach Status & Notes */}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">
							Outreach Status
						</h3>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full p-2 border rounded-md text-sm dark:border-gray-700 dark:bg-gray-800"
						>
							<option value="new">New</option>
							<option value="contacted">Contacted</option>
							<option value="replied">Replied</option>
							<option value="converted">Converted</option>
							<option value="ignored">Ignored</option>
						</select>
					</div>
					<div>
						<h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="w-full p-2 border rounded-md text-sm dark:border-gray-700 dark:bg-gray-800 h-16 resize-none"
							placeholder="Add notes..."
						/>
					</div>
				</div>
			</DialogContent>
			<DialogFooter>
				<button
					onClick={() => onOpenChange(false)}
					className="px-4 py-2 border rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					Close
				</button>
				<button
					onClick={() => {
						alert(
							"Save changes (status & notes) - this will be persisted later",
						);
						onOpenChange(false);
					}}
					className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
				>
					Save Changes
				</button>
			</DialogFooter>
		</Dialog>
	);
}
