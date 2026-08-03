import React, { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@ataqu/shared-stores';
import { useDebounce } from '@ataqu/shared-hooks';
import { searchContacts } from '@ataqu/api-client/cinq';
import { searchDocuments } from '@ataqu/api-client/pivot';
import { searchMessages } from '@ataqu/api-client/dial';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [results, setResults] = useState<SearchResult[]>([]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle]);

  // App navigation items (hardcoded)
  const appItems = [
    { id: 'aegis', name: 'AEGIS', icon: '🔐', path: 'https://sso.ataqu.com' },
    { id: 'cinq', name: 'CINQ', icon: '📊', path: 'https://crm.ataqu.com' },
    { id: 'dial', name: 'DIAL', icon: '💬', path: 'https://chat.ataqu.com' },
    { id: 'pivot', name: 'PIVOT', icon: '📝', path: 'https://docs.ataqu.com' },
    { id: 'spark', name: 'SPARK', icon: '⚡', path: 'https://auto.ataqu.com' },
    { id: 'tempo', name: 'TEMPO', icon: '📅', path: 'https://schedule.ataqu.com' },
    { id: 'sond', name: 'SOND', icon: '📋', path: 'https://forms.ataqu.com' },
    { id: 'vault', name: 'VAULT', icon: '📦', path: 'https://inv.ataqu.com' },
    { id: 'pause', name: 'PAUSE', icon: '👤', path: 'https://hr.ataqu.com' },
    { id: 'vista', name: 'VISTA', icon: '📈', path: 'https://bi.ataqu.com' },
  ];

  // Simulate search across apps (in real app, we'd use query hooks)
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setResults([]);
      return;
    }
    // For demo, we'll just show a static list
    const filtered = appItems.filter((item) =>
      item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    setResults(
      filtered.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: `Go to ${item.name}`,
        url: item.path,
      }))
    );
  }, [debouncedSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={() => setOpen(false)}>
      <div
        className="ataqu-glass w-full max-w-lg rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="p-2">
          <Command.Input
            placeholder="Search apps or data..."
            value={search}
            onValueChange={setSearch}
            className="w-full bg-transparent border-b border-gray-600/40 p-2 outline-none text-white placeholder-gray-400"
          />
          <Command.List className="max-h-80 overflow-y-auto">
            {!search && (
              <Command.Group heading="Apps">
                {appItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => { window.location.href = item.path; }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {search && results.length > 0 && (
              <Command.Group heading="Results">
                {results.map((result) => (
                  <Command.Item
                    key={result.id}
                    onSelect={() => { window.location.href = result.url; }}
                    className="flex flex-col px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer"
                  >
                    <span>{result.title}</span>
                    {result.subtitle && <span className="text-xs text-gray-400">{result.subtitle}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {search && results.length === 0 && (
              <Command.Empty className="p-4 text-center text-gray-400">
                No results found for "{search}"
              </Command.Empty>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
