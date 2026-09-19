import type { ContactResponse } from "@ataqu/api-client";
import { useUpdateContact } from "@ataqu/api-client";
import { Accordion, FloatingLabelInput } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

export function CustomFieldsTab({ contact }: { contact: ContactResponse }) {
	const [fields, setFields] = useState<Record<string, any>>(
		contact.custom_fields || {},
	);
	const updateContact = useUpdateContact();

	const handleChange = (key: string, value: string) => {
		const newFields = { ...fields, [key]: value };
		setFields(newFields);
		updateContact.mutate({
			id: contact.id,
			data: { custom_fields: newFields },
			version: contact.version,
		});
	};

	if (Object.keys(fields).length === 0) {
		return (
			<p className="text-muted-foreground">
				<Trans>No custom fields</Trans>
			</p>
		);
	}

	const fieldRows = Object.entries(fields).map(([key, value]) => (
		<div key={key} className="flex items-center gap-2 py-1">
			<label className="w-32 font-medium shrink-0">{key}</label>
			<FloatingLabelInput
				label={key}
				value={String(value ?? "")}
				onChange={(v: string) => handleChange(key, v)}
			/>
		</div>
	));

	return (
		<Accordion
			items={[
				{
					id: "custom-fields",
					title: <Trans>Custom Fields</Trans>,
					meta: `${Object.keys(fields).length}`,
					content: <div className="space-y-3 py-2">{fieldRows}</div>,
				},
			]}
		/>
	);
}
