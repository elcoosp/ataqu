import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { ContactTable } from '../components/contact-table';

export const Route = createFileRoute('/_auth/contacts/')({
  component: ContactsIndex,
});

function ContactsIndex() {
  return (
    <DashboardLayout title={<Trans>Contacts</Trans>}>
      <div className="p-4">
        <ContactTable />
      </div>
    </DashboardLayout>
  );
}
