import { Button, DashboardLayout } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ContactTable } from "../components/contact-table";
import { CreateContactDialog } from "../components/create-contact-dialog";

export const Route = createFileRoute("/_auth/contacts/")({
	component: ContactsIndex,
});

function ContactsIndex() {
	const [openCreate, setOpenCreate] = useState(false);
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
				<ContactTable />
			</div>
			<CreateContactDialog open={openCreate} onOpenChange={setOpenCreate} />
		</DashboardLayout>
	);
}
