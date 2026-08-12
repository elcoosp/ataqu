import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@ataqu/api-client';
import { Popover, PopoverContent, PopoverTrigger } from '@ataqu/ui';
import { Input } from '@ataqu/ui';
import { SearchIcon } from 'lucide-react';
import { Trans } from '@lingui/react/macro';

interface RelationCellProps {
  value?: { app: string; entityId: string; label: string };
  onSelect: (value: { app: string; entityId: string; label: string } | null) => void;
  app: 'cinq' | 'vault'; // which app to query
}

export function RelationCell({ value, onSelect, app }: RelationCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: results, isLoading } = useQuery({
    queryKey: ['relation-search', app, search],
    queryFn: () => {
      if (!search) return [];
      const endpoint = app === 'cinq' ? '/cinq/deals' : '/vault/products';
      return api.get<any[]>(endpoint, { params: { q: search, limit: 10 } });
    },
    enabled: open && search.length > 1,
  });

  const handleSelect = (item: any) => {
    const label = item.title || item.name;
    onSelect({ app, entityId: item.id, label });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left text-sm hover:bg-accent p-1 rounded">
          {value ? (
            <span className="text-primary underline">{value.label}</span>
          ) : (
            <span className="text-muted-foreground"><Trans>Link {app}</Trans></span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={<Trans>Search {app}…</Trans>}
            className="pl-8"
          />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground"><Trans>Searching…</Trans></p>}
        <div className="mt-2 max-h-40 overflow-y-auto">
          {results?.map((item: any) => (
            <button
              key={item.id}
              className="w-full text-left px-2 py-1 hover:bg-accent rounded text-sm"
              onClick={() => handleSelect(item)}
            >
              {item.title || item.name}
            </button>
          ))}
          {results?.length === 0 && <p className="text-sm text-muted-foreground"><Trans>No results</Trans></p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
