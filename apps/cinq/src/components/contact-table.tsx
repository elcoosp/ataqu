import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { DataTable, Input } from '@ataqu/ui';
import { Search } from 'lucide-react';
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

  const contacts = debouncedSearch.length > 0 ? (searchData || []) : (allData || []);
  const isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;

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

      <DataTable
        columns={[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'email', header: 'Email' },
          { accessorKey: 'phone', header: 'Phone' },
          { accessorKey: 'company', header: 'Company' },
          {
            accessorKey: 'custom_fields',
            header: 'Custom',
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
        emptyState={
          <div className="text-center py-8 text-gray-400">
            <Trans>No contacts yet. Create one to get started.</Trans>
          </div>
        }
      />
    </div>
  );
}
