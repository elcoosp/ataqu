import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { ContactTable } from '../components/contact-table';

export const Route = createFileRoute('/_auth/contacts/')({
  component: ContactsIndex,
});

function ContactsIndex() {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4"><Trans>Contacts</Trans></h1>
        <ContactTable />
      </div>
    </DashboardLayout>
  );
}
