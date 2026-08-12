import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DataTable, EmptyState, Input } from '@ataqu/ui';
import { Users, Search } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { useListContacts, useSearchContacts } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';

export function ContactTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: allData, isLoading: allLoading } = useListContacts(
    { limit: 1000 },
    { enabled: debouncedSearch.length === 0 }
  );

  const { data: searchData, isLoading: searchLoading } = useSearchContacts(
    { q: debouncedSearch, limit: 50 },
    { enabled: debouncedSearch.length > 0 }
  );

  const contacts = debouncedSearch.length > 0 ? (searchData || []) : (allData?.items || []);
  const isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div ref={parentRef} className="h-[600px] overflow-auto">
        {contacts.length === 0 && !isLoading ? (
          <EmptyState
            icon={Users}
            title={<Trans>No contacts yet</Trans>}
            description={<Trans>Drop your HubSpot CSV here, or create your first contact.</Trans>}
            ctaLabel={<Trans>Create Contact</Trans>}
            onCta={() => navigate({ to: '/contacts/new' })}
          />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'name', header: <Trans>Name</Trans> },
              { accessorKey: 'email', header: <Trans>Email</Trans> },
              { accessorKey: 'phone', header: <Trans>Phone</Trans> },
              { accessorKey: 'company', header: <Trans>Company</Trans> },
              {
                accessorKey: 'custom_fields',
                header: <Trans>Custom</Trans>,
                cell: ({ row }) => {
                  const fields = row.original.custom_fields || {};
                  const entries = Object.entries(fields).slice(0, 2);
                  return <span>{entries.map(([k, v]) => `${k}: ${v}`).join(', ')}</span>;
                },
              },
            ]}
            data={contacts}
            isLoading={isLoading}
            onRowClick={(row) => navigate({ to: `/contacts/${row.id}` })}
          />
        )}
      </div>
    </div>
  );
}
