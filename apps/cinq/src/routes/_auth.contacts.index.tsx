import {
	useListContacts,
	useSearchByCustomField,
	useSearchCustomFieldsCross,
} from "@ataqu/api-client";
import { Bone, Button, DashboardLayout, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ContactTable } from "../components/contact-table";
import { CreateContactDialog } from "../components/create-contact-dialog";

export const Route = createFileRoute("/_auth/contacts/")({
	component: ContactsIndex,
});

type ContactItem = { id: string; name?: string; email?: string };

function ContactsIndex() {
	const [openCreate, setOpenCreate] = useState(false);
	const [field, setField] = useState("");
	const [value, setValue] = useState("");
	const [crossQuery, setCrossQuery] = useState("");

	const fieldSearch = useSearchByCustomField(field, value, {
		enabled: field.trim().length > 0 && value.trim().length > 0,
		queryKey: ["cinq", "search-custom", field, value],
	});
	const crossSearch = useSearchCustomFieldsCross(
		{ q: crossQuery },
		{
			enabled: crossQuery.trim().length > 0,
			queryKey: ["cinq", "search-cross", crossQuery],
		},
	);
	useListContacts({ limit: 100, offset: 0 });

	const fieldResults = (fieldSearch.data as ContactItem[] | undefined) ?? [];
	const crossResults = (crossSearch.data as ContactItem[] | undefined) ?? [];

	return (
		<DashboardLayout>
			<div className="p-4">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-bold">
						<Trans>Contacts</Trans>
					</h1>
					<Button size="sm" onClick={() => setOpenCreate(true)}>
						<Plus className="h-4 w-4 mr-1" />
						<Trans>New Contact</Trans>
					</Button>
				</div>

				<div className="mb-6 grid gap-4 md:grid-cols-2">
					<div className="space-y-2 rounded-lg border border-border p-3">
						<Label>
							<Trans>Search by custom field</Trans>
						</Label>
						<div className="flex gap-2">
							<Input
								placeholder="field"
								value={field}
								onChange={(e) => setField(e.target.value)}
							/>
							<Input
								placeholder="value"
								value={value}
								onChange={(e) => setValue(e.target.value)}
							/>
						</div>
						<Bone
							loading={fieldSearch.isFetching}
							name="custom-field-search"
							fallback={<div className="h-16 rounded" />}
						>
							{null}
						</Bone>
						{fieldResults.length > 0 && (
							<ul className="space-y-1 text-sm">
								{fieldResults.map((c) => (
									<li key={c.id} className="border-b border-border py-1">
										{c.name ?? c.email ?? c.id}
									</li>
								))}
							</ul>
						)}
					</div>

					<div className="space-y-2 rounded-lg border border-border p-3">
						<Label>
							<Trans>Cross-field search</Trans>
						</Label>
						<div className="flex gap-2">
							<Input
								placeholder="search all fields..."
								value={crossQuery}
								onChange={(e) => setCrossQuery(e.target.value)}
							/>
							<Search className="h-4 w-4 self-center text-muted-foreground" />
						</div>
						<Bone
							loading={crossSearch.isFetching}
							name="cross-search"
							fallback={<div className="h-16 rounded" />}
						>
							{null}
						</Bone>
						{crossResults.length > 0 && (
							<ul className="space-y-1 text-sm">
								{crossResults.map((c) => (
									<li key={c.id} className="border-b border-border py-1">
										{c.name ?? c.email ?? c.id}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				<ContactTable />
			</div>
			<CreateContactDialog open={openCreate} onOpenChange={setOpenCreate} />
		</DashboardLayout>
	);
}
