import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface NodeConfigPanelProps {
	node: Node | null;
	onClose: () => void;
	onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

// Native outbox event types (from backend contracts)
const NATIVE_EVENTS = [
	{ value: "cinq.deal.won", label: "CINQ: Deal Won" },
	{ value: "cinq.deal.lost", label: "CINQ: Deal Lost" },
	{ value: "cinq.contact.created", label: "CINQ: Contact Created" },
	{ value: "sond.form.submitted", label: "SOND: Form Submitted" },
	{
		value: "vault.stock.below_threshold",
		label: "VAULT: Stock Below Threshold",
	},
	{ value: "vault.stock.reserved", label: "VAULT: Stock Reserved" },
	{ value: "pause.leave.requested", label: "PAUSE: Leave Requested" },
	{ value: "pause.leave.approved", label: "PAUSE: Leave Approved" },
	{ value: "tempo.meeting.no_show", label: "TEMPO: Meeting No-Show" },
	{ value: "tempo.booking.created", label: "TEMPO: Booking Created" },
	{ value: "dial.message.sent", label: "DIAL: Message Sent" },
];

export function NodeConfigPanel({
	node,
	onClose,
	onUpdate,
}: NodeConfigPanelProps) {
	const [config, setConfig] = useState<Record<string, unknown>>({});
	const [label, setLabel] = useState("");

	useEffect(() => {
		if (node) {
			setLabel(String(node.data?.label || ""));
			setConfig((node.data?.config as Record<string, unknown>) || {});
		}
	}, [node]);

	if (!node) return null;

	const nodeType = String(node.data?.category || "");
	const subtype = String(node.data?.subtype || "");

	const handleSave = () => {
		onUpdate(node.id, { ...node.data, label, config });
	};

	const updateConfig = (key: string, value: unknown) => {
		setConfig((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<aside className="w-80 border-l border-border bg-card p-4 overflow-y-auto flex-shrink-0">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-heading font-bold text-foreground">
					{nodeType === "trigger" && <Trans>Configure Trigger</Trans>}
					{nodeType === "action" && <Trans>Configure Action</Trans>}
					{nodeType === "condition" && <Trans>Configure Condition</Trans>}
				</h2>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="h-6 w-6"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="space-y-4">
				<div>
					<Label htmlFor="node-label">
						<Trans>Label</Trans>
					</Label>
					<Input
						id="node-label"
						value={label}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setLabel(e.target.value)
						}
						className="mt-1"
					/>
				</div>

				{/* Trigger configuration */}
				{nodeType === "trigger" && (
					<>
						{subtype === "event" && (
							<div>
								<Label htmlFor="event-type">
									<Trans>Outbox Event Type</Trans>
								</Label>
								<select
									id="event-type"
									className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm"
									value={String(config.event_type || "")}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										updateConfig("event_type", e.target.value)
									}
								>
									<option value="">
										<Trans>Select an event...</Trans>
									</option>
									{NATIVE_EVENTS.map((ev) => (
										<option key={ev.value} value={ev.value}>
											{ev.label}
										</option>
									))}
								</select>
							</div>
						)}
						{subtype === "event" && (
							<div>
								<Label htmlFor="event-filter">
									<Trans>Filter (JSON, optional)</Trans>
								</Label>
								<textarea
									id="event-filter"
									className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm font-mono h-20"
									placeholder='{"amount": {"$gt": 1000}}'
									value={
										typeof config.filter === "string"
											? config.filter
											: JSON.stringify(config.filter || {}, null, 2)
									}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
										try {
											updateConfig("filter", JSON.parse(e.target.value));
										} catch {
											updateConfig("filter", e.target.value);
										}
									}}
								/>
							</div>
						)}
						{subtype === "schedule" && (
							<>
								<div>
									<Label htmlFor="cron-expr">
										<Trans>Cron Expression</Trans>
									</Label>
									<Input
										id="cron-expr"
										value={String(config.cron || "")}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											updateConfig("cron", e.target.value)
										}
										placeholder="0 9 * * 1-5"
										className="mt-1 font-mono"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										<Trans>Example: Every weekday at 9:00 AM</Trans>
									</p>
								</div>
								<div>
									<Label htmlFor="timezone">
										<Trans>Timezone</Trans>
									</Label>
									<select
										id="timezone"
										className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm"
										value={String(config.timezone || "UTC")}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											updateConfig("timezone", e.target.value)
										}
									>
										<option value="UTC">UTC</option>
										<option value="America/New_York">America/New_York</option>
										<option value="America/Chicago">America/Chicago</option>
										<option value="America/Denver">America/Denver</option>
										<option value="America/Los_Angeles">
											America/Los_Angeles
										</option>
										<option value="Europe/London">Europe/London</option>
										<option value="Europe/Paris">Europe/Paris</option>
										<option value="Europe/Berlin">Europe/Berlin</option>
										<option value="Asia/Tokyo">Asia/Tokyo</option>
										<option value="Asia/Shanghai">Asia/Shanghai</option>
									</select>
								</div>
							</>
						)}
						{subtype === "webhook" && (
							<>
								<div>
									<Label>
										<Trans>Webhook URL</Trans>
									</Label>
									<div className="mt-1 p-2 rounded-md bg-muted/50 border border-border text-xs font-mono text-muted-foreground break-all">
										POST /api/webhooks/{"{tenant_id}"}/{"{workflow_id}"}
									</div>
								</div>
								<div>
									<Label htmlFor="webhook-secret">
										<Trans>Webhook Secret (optional)</Trans>
									</Label>
									<Input
										id="webhook-secret"
										type="password"
										value={String(config.webhook_secret || "")}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											updateConfig("webhook_secret", e.target.value)
										}
										className="mt-1 font-mono"
										placeholder="x-webhook-secret"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										<Trans>Send as X-Webhook-Secret header</Trans>
									</p>
								</div>
							</>
						)}
					</>
				)}

				{/* Action configuration */}
				{nodeType === "action" && (
					<>
						<div>
							<Label htmlFor="action-params">
								<Trans>Parameters (JSON)</Trans>
							</Label>
							<textarea
								id="action-params"
								className="w-full mt-1 p-2 rounded-md border border-border bg-background text-foreground text-sm font-mono h-32"
								value={
									typeof config.params === "string"
										? config.params
										: JSON.stringify(config.params || {}, null, 2)
								}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
									try {
										updateConfig("params", JSON.parse(e.target.value));
									} catch {
										updateConfig("params", e.target.value);
									}
								}}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								<Trans>Use {"{{payload.field}}"} for dynamic values</Trans>
							</p>
						</div>
						{subtype === "send_email" && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									<Trans>Required params:</Trans>{" "}
									<code className="text-foreground">to</code>,{" "}
									<code className="text-foreground">subject</code>,{" "}
									<code className="text-foreground">body</code>
								</p>
							</div>
						)}
						{subtype === "create_dial_channel" && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									<Trans>Required params:</Trans>{" "}
									<code className="text-foreground">name</code>,{" "}
									<code className="text-foreground">channel_type</code>,{" "}
									<code className="text-foreground">participants</code>
								</p>
							</div>
						)}
						{subtype === "send_dial_message" && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									<Trans>Required params:</Trans>{" "}
									<code className="text-foreground">channel_id</code>,{" "}
									<code className="text-foreground">content</code>
								</p>
							</div>
						)}
						{subtype === "reserve_vault_stock" && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									<Trans>Required params:</Trans>{" "}
									<code className="text-foreground">variant_id</code>,{" "}
									<code className="text-foreground">quantity</code>
								</p>
							</div>
						)}
						{subtype === "webhook_action" && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									<Trans>Required params:</Trans>{" "}
									<code className="text-foreground">url</code>,{" "}
									<code className="text-foreground">method</code>,{" "}
									<code className="text-foreground">body</code>,{" "}
									<code className="text-foreground">headers</code>
								</p>
							</div>
						)}
					</>
				)}

				{/* Condition configuration */}
				{nodeType === "condition" && (
					<>
						{subtype !== "and" && subtype !== "or" && (
							<>
								<div>
									<Label htmlFor="cond-field">
										<Trans>Field Path</Trans>
									</Label>
									<Input
										id="cond-field"
										value={String(config.field || "")}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											updateConfig("field", e.target.value)
										}
										placeholder="payload.amount"
										className="mt-1 font-mono"
									/>
								</div>
								{subtype !== "field_exists" && (
									<div>
										<Label htmlFor="cond-value">
											<Trans>Value</Trans>
										</Label>
										<Input
											id="cond-value"
											value={String(config.value ?? "")}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												updateConfig("value", e.target.value)
											}
											className="mt-1"
										/>
									</div>
								)}
							</>
						)}
						{(subtype === "and" || subtype === "or") && (
							<div className="p-3 rounded-md bg-muted/30 border border-border">
								<p className="text-xs text-muted-foreground">
									{subtype === "and" ? (
										<Trans>All child conditions must be true (AND logic)</Trans>
									) : (
										<Trans>
											At least one child condition must be true (OR logic)
										</Trans>
									)}
								</p>
							</div>
						)}
					</>
				)}
			</div>

			<div className="mt-6 pt-4 border-t border-border">
				<Button onClick={handleSave} className="w-full">
					<Trans>Save Configuration</Trans>
				</Button>
			</div>
		</aside>
	);
}
