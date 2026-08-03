import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="ataqu-glass w-full max-w-lg rounded-lg shadow-lg">
        <Command className="p-2">
          <Command.Input placeholder="Search apps..." className="w-full bg-transparent border-b border-gray-600/40 p-2 outline-none" />
          <Command.List>
            <Command.Group heading="Apps">
              {['cinq','dial','pivot','spark','tempo','sond','vault','pause','vista','aegis'].map(app => (
                <Command.Item key={app} onSelect={() => { window.location.href = `https://${app}.ataqu.com`; }}>{app}</Command.Item>
              ))}
            </Command.Group>
            <Command.Empty>No results.</Command.Empty>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
