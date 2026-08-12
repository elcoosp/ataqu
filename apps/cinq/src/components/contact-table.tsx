import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Input, Skeleton } from '@ataqu/ui';
import { Search } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { useListContacts, useSearchContacts } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';

export function ContactTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // useListContacts returns ContactResponse[] directly
  const { data: allData, isLoading: allLoading } = useListContacts(
    { limit: 1000 },
    { enabled: debouncedSearch.length === 0 }
  );

  // useSearchContacts returns ContactResponse[] directly
  const { data: searchData, isLoading: searchLoading } = useSearchContacts(
    { q: debouncedSearch, limit: 50 },
    { enabled: debouncedSearch.length > 0 }
  );

  const contacts = debouncedSearch.length > 0 ? (searchData || []) : (allData || []);
  const isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

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

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Trans>No contacts yet. Create one to get started.</Trans>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Phone</th>
                <th className="text-left py-2 px-3">Company</th>
                <th className="text-left py-2 px-3">Custom</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate({ to: `/contacts/${contact.id}` })}
                >
                  <td className="py-2 px-3">{contact.name}</td>
                  <td className="py-2 px-3">{contact.email}</td>
                  <td className="py-2 px-3">{contact.phone}</td>
                  <td className="py-2 px-3">{contact.company}</td>
                  <td className="py-2 px-3">
                    {Object.entries(contact.custom_fields || {}).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
