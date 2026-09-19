import type { Form } from "@ataqu/api-client";

type Rules = NonNullable<Form["routing_rules"]>;

/** Only the unconditional CINQ shortcut is managed here; authored rules stay intact. */
export function setLeadIntegration(rules: Rules = [], enabled: boolean): Rules {
	const preserved = rules.flatMap((rule) => {
		if (rule.conditions.length > 0) return [rule];
		const actions = rule.actions.filter(
			(action) => !(action.type === "create_lead" && action.target === "cinq"),
		);
		return actions.length ? [{ ...rule, actions }] : [];
	});
	return enabled
		? [
				...preserved,
				{ conditions: [], actions: [{ type: "create_lead", target: "cinq" }] },
			]
		: preserved;
}
