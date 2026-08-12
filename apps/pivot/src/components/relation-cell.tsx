import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { Popover, PopoverContent, PopoverTrigger } from '@ataqu/ui';
import { Input } from '@ataqu/ui';
import { SearchIcon, X } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { i18n } from '@lingui/core';
import { useDebounce } from '@ataqu/shared-hooks';
import { handleApiError } from '@ataqu/shared-utils';
import { toast } from 'sonner';

interface RelationCellProps {
  value?: { app: 'cinq' | 'vault'; entityId: string; label: string } | null;
  onSelect: (value: { app: 'cinq' | 'vault'; entityId: string; label: string } | null) => void;
  app: 'cinq' | 'vault';
  placeholder?: string;
}

export function RelationCell({ value, onSelect, app, placeholder }: RelationCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['relation-search', app, debouncedSearch],
    queryFn: () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const endpoint = app === 'cinq' ? '/cinq/deals' : '/vault/products';
      return api.get<any[]>(endpoint, { params: { q: debouncedSearch, limit: 10 } });
    },
    enabled: open && debouncedSearch.length >= 2,
  });

  const handleSelect = (item: any) => {
    const label = item.title || item.name || item.id;
    const newVal = { app, entityId: item.id, label };
    setSelectedValue(newVal);
    onSelect(newVal);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedValue(null);
    onSelect(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full text-left text-sm hover:bg-accent p-1 rounded flex items-center justify-between"
          onClick={() => setOpen(true)}
        >
          <span>
            {selectedValue ? (
              <span className="text-primary underline">{selectedValue.label}</span>
            ) : (
              <span className="text-muted-foreground">
                <Trans>Link {app}</Trans>
              </span>
            )}
          </span>
          {selectedValue && (
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder || i18n.t`Search ${app}…`}
            className="pl-8"
            autoFocus
          />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground mt-2"><Trans>Searching…</Trans></p>}
        {error && <p className="text-sm text-error mt-2">{handleApiError(error)}</p>}
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {results?.map((item: any) => (
            <button
              key={item.id}
              className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
              onClick={() => handleSelect(item)}
            >
              {item.title || item.name || item.id}
            </button>
          ))}
          {results?.length === 0 && debouncedSearch.length >= 2 && (
            <p className="text-sm text-muted-foreground"><Trans>No results</Trans></p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
