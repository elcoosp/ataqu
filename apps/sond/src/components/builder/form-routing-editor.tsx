import { type Form, useUpdateFormRouting } from "@ataqu/api-client";
import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Condition {
	field: string;
	operator: "eq" | "neq" | "contains" | "not_contains";
	value: string;
}

interface Action {
	type: "notify" | "create_lead" | "webhook";
	target?: string;
	url?: string;
}

interface Rule {
	conditions: Condition[];
	actions: Action[];
}

const OPERATORS: Condition["operator"][] = [
	"eq",
	"neq",
	"contains",
	"not_contains",
];

const ACTION_TYPES: Action["type"][] = ["notify", "create_lead", "webhook"];

function emptyRule(): Rule {
	return {
		conditions: [{ field: "", operator: "eq", value: "" }],
		actions: [{ type: "notify" }],
	};
}

/**
 * Conditional routing editor (spec 2.4). Lets a form owner define rules:
 * "if answer matches condition → notify / create lead / webhook".
 * Persisted via PATCH /sond/forms/:id/routing.
 */
export function FormRoutingEditor({
	formId,
	initialRules,
}: {
	formId: string;
	initialRules: Form["routing_rules"];
}) {
	const [rules, setRules] = useState<Rule[]>(
		(initialRules as Rule[] | undefined) ?? [],
	);
	const [saving, setSaving] = useState(false);
	const updateRouting = useUpdateFormRouting();

	const save = () => {
		setSaving(true);
		updateRouting.mutate(
			{ id: formId as Form["id"], rules },
			{
				onSettled: () => setSaving(false),
				onSuccess: () => {},
				onError: () => {},
			},
		);
	};

	const addRule = () => setRules((r) => [...r, emptyRule()]);
	const removeRule = (i: number) =>
		setRules((r) => r.filter((_, idx) => idx !== i));

	const updateRule = (i: number, patch: Partial<Rule>) =>
		setRules((r) =>
			r.map((rule, idx) => (idx === i ? { ...rule, ...patch } : rule)),
		);

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				<Trans>
					Define conditions to route submissions automatically — notify a team,
					create a lead in CINQ, or call a webhook.
				</Trans>
			</p>

			{rules.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>No routing rules yet.</Trans>
				</p>
			) : (
				rules.map((rule, i) => (
					<div
						key={i}
						className="space-y-3 rounded-lg border border-border bg-card p-4"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								<Trans>Rule {i + 1}</Trans>
							</span>
							<Button variant="ghost" size="sm" onClick={() => removeRule(i)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>

						<div className="space-y-2">
							<Label>
								<Trans>Conditions (all must match)</Trans>
							</Label>
							{rule.conditions.map((c, ci) => (
								<div key={ci} className="flex flex-wrap gap-2">
									<Input
										placeholder="question id"
										value={c.field}
										onChange={(e) =>
											updateRule(i, {
												conditions: rule.conditions.map((cc, idx) =>
													idx === ci ? { ...cc, field: e.target.value } : cc,
												),
											})
										}
										className="w-40"
									/>
									<select
										value={c.operator}
										onChange={(e) =>
											updateRule(i, {
												conditions: rule.conditions.map((cc, idx) =>
													idx === ci
														? {
																...cc,
																operator: e.target
																	.value as Condition["operator"],
															}
														: cc,
												),
											})
										}
										className="rounded border border-border bg-background px-2 py-1 text-sm"
									>
										{OPERATORS.map((op) => (
											<option key={op} value={op}>
												{op}
											</option>
										))}
									</select>
									<Input
										placeholder="value"
										value={c.value}
										onChange={(e) =>
											updateRule(i, {
												conditions: rule.conditions.map((cc, idx) =>
													idx === ci ? { ...cc, value: e.target.value } : cc,
												),
											})
										}
										className="w-40"
									/>
								</div>
							))}
						</div>

						<div className="space-y-2">
							<Label>
								<Trans>Actions</Trans>
							</Label>
							{rule.actions.map((a, ai) => (
								<div key={ai} className="flex flex-wrap gap-2">
									<select
										value={a.type}
										onChange={(e) =>
											updateRule(i, {
												actions: rule.actions.map((aa, idx) =>
													idx === ai
														? { ...aa, type: e.target.value as Action["type"] }
														: aa,
												),
											})
										}
										className="rounded border border-border bg-background px-2 py-1 text-sm"
									>
										{ACTION_TYPES.map((t) => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
									{a.type === "notify" ? (
										<Input
											placeholder="email / user id"
											value={a.target ?? ""}
											onChange={(e) =>
												updateRule(i, {
													actions: rule.actions.map((aa, idx) =>
														idx === ai ? { ...aa, target: e.target.value } : aa,
													),
												})
											}
											className="w-48"
										/>
									) : null}
									{a.type === "webhook" ? (
										<Input
											placeholder="https://..."
											value={a.url ?? ""}
											onChange={(e) =>
												updateRule(i, {
													actions: rule.actions.map((aa, idx) =>
														idx === ai ? { ...aa, url: e.target.value } : aa,
													),
												})
											}
											className="w-56"
										/>
									) : null}
								</div>
							))}
						</div>
					</div>
				))
			)}

			<div className="flex gap-2">
				<Button variant="outline" onClick={addRule}>
					<Plus className="mr-2 h-4 w-4" />
					<Trans>Add Rule</Trans>
				</Button>
				<Button onClick={save} disabled={saving || updateRouting.isPending}>
					{saving ? <Trans>Saving...</Trans> : <Trans>Save Routing</Trans>}
				</Button>
			</div>
		</div>
	);
}
