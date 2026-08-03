import React, { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@ataqu/ui';
import { Home, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '@ataqu/shared-stores';
import { useNavigate } from '@tanstack/react-router';

const APP_DOMAINS: Record<string, string> = {
  aegis: 'sso',
  cinq: 'crm',
  dial: 'chat',
  pivot: 'docs',
  spark: 'auto',
  tempo: 'schedule',
  sond: 'forms',
  vault: 'inv',
  pause: 'hr',
  vista: 'bi',
};

const APP_NAMES: Record<string, string> = {
  aegis: 'AEGIS',
  cinq: 'CINQ',
  dial: 'DIAL',
  pivot: 'PIVOT',
  spark: 'SPARK',
  tempo: 'TEMPO',
  sond: 'SOND',
  vault: 'VAULT',
  pause: 'PAUSE',
  vista: 'VISTA',
};

const APP_ICONS: Record<string, string> = {
  aegis: '/apps/aegis.png',
  cinq: '/apps/cinq.png',
  dial: '/apps/dial.png',
  pivot: '/apps/pivot.png',
  spark: '/apps/spark.png',
  tempo: '/apps/tempo.png',
  sond: '/apps/sond.png',
  vault: '/apps/vault.png',
  pause: '/apps/pause.png',
  vista: '/apps/vista.png',
};

const APP_PORTS: Record<string, number> = {
  aegis: 5173,
  cinq: 5174,
  dial: 5175,
  pivot: 5176,
  spark: 5177,
  tempo: 5178,
  sond: 5179,
  vault: 5180,
  pause: 5181,
  vista: 5182,
};

function getAppUrl(app: string): string {
  if (import.meta.env.DEV) {
    return `http://localhost:${APP_PORTS[app]}`;
  }
  return `https://${APP_DOMAINS[app]}.ataqu.com`;
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search apps, navigate, or run commands..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Switch App">
          {Object.keys(APP_DOMAINS).map((app) => (
            <CommandItem
              key={app}
              onSelect={() => handleSelect(() => {
                window.location.href = getAppUrl(app);
              })}
            >
              <img src={APP_ICONS[app]} alt={APP_NAMES[app]} className="h-5 w-5 mr-2" />
              <span>{APP_NAMES[app]}</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘{app[0]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => navigate({ to: '/dashboard' }))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => console.log('Search opened'))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Global Search</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => handleSelect(logout)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
