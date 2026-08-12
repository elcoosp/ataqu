import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Input, Skeleton } from '@ataqu/ui';
import { Search } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { listContacts, searchContacts } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';
import type { ContactResponse } from '@ataqu/api-client';

export function ContactTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: allData,
    isLoading: allLoading,
    error: allError,
  } = useQuery({
    queryKey: ['cinq', 'contacts', 'list'],
    queryFn: () => listContacts({ limit: 1000 }),
    enabled: debouncedSearch.length === 0,
  });

  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchError,
  } = useQuery({
    queryKey: ['cinq', 'contacts', 'search', debouncedSearch],
    queryFn: () => searchContacts({ q: debouncedSearch, limit: 50 }),
    enabled: debouncedSearch.length > 0,
  });

  const contacts = debouncedSearch.length > 0 ? (searchData || []) : (allData || []);
  const isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;
  const error = debouncedSearch.length > 0 ? searchError : allError;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <Trans>Error loading contacts</Trans>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={<Trans>Search contacts...</Trans>}
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
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-700/40 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-deep-night/90 z-10 border-b border-gray-700">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-400"><Trans>Name</Trans></th>
                <th className="text-left py-2 px-3 font-medium text-gray-400"><Trans>Email</Trans></th>
                <th className="text-left py-2 px-3 font-medium text-gray-400"><Trans>Phone</Trans></th>
                <th className="text-left py-2 px-3 font-medium text-gray-400"><Trans>Company</Trans></th>
                <th className="text-left py-2 px-3 font-medium text-gray-400"><Trans>Custom</Trans></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigate({ to: `/contacts/${contact.id}` })}
                >
                  <td className="py-2 px-3">{contact.name}</td>
                  <td className="py-2 px-3">{contact.email}</td>
                  <td className="py-2 px-3">{contact.phone}</td>
                  <td className="py-2 px-3">{contact.company}</td>
                  <td className="py-2 px-3">
                    {Object.entries(contact.custom_fields || {})
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
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
