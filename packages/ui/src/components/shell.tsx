import React from 'react';
import { useAuthStore, useUIStore } from '@ataqu/shared-stores';
import { CommandPalette } from './command-palette';

export const Shell: React.FC<{ activeApp: string; children: React.ReactNode }> = ({ activeApp, children }) => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const apps = ['aegis','cinq','dial','pivot','spark','tempo','sond','vault','pause','vista'];
  return (
    <div className="flex h-screen bg-deep-night text-white">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} border-r border-gray-700/40 transition-all duration-150 flex-shrink-0`}>
        <div className="p-4">
          {apps.map((app) => (
            <a key={app} href={`https://${app}.ataqu.com`} className={`block py-2 ${activeApp===app?'text-amber':'text-gray-400'}`}>{app}</a>
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-700/40 flex items-center justify-between px-6">
          <button onClick={toggleSidebar} className="text-gray-300">☰</button>
          <span className="font-heading text-xl">Ataqu</span>
          <div className="flex items-center gap-4">
            <button onClick={() => document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true}))}>⌘K</button>
            <span>{user?.email||'Guest'}</span>
            <button onClick={logout} className="text-error">Logout</button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <CommandPalette />
          {children}
        </div>
      </main>
    </div>
  );
};
