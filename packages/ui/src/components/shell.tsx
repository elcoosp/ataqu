import React, { useState } from 'react';
import { useAuthStore, useUIStore } from '@ataqu/shared-stores';
import { CommandPalette } from './command-palette';
import { Button } from './button';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';

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

export interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface ShellProps {
  activeApp: string;
  children: React.ReactNode;
  searchFn?: (q: string) => Promise<unknown[]>;
  extraSidebarItems?: SidebarItem[];
}

export const Shell: React.FC<ShellProps> = ({ activeApp, children, searchFn, extraSidebarItems = [] }) => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const [appsExpanded, setAppsExpanded] = useState(true); // default expanded

  const appKeys = Object.keys(APP_ICONS);

  return (
    <div className="flex h-screen bg-[#0A1628] text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-[#0A1628]/80 border-r border-gray-700/40 transition-all duration-150 ease-out overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700/40">
          {sidebarOpen ? (
            <span className="font-heading text-xl text-white">Ataqu</span>
          ) : (
            <span className="text-2xl font-heading text-amber">A</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {/* All Apps collapsible section */}
          {sidebarOpen && (
            <div className="px-4 mb-2">
              <button
                onClick={() => setAppsExpanded(!appsExpanded)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                <span>All Apps</span>
                {appsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          )}
          {appsExpanded && (
            <>
              {appKeys.map((app) => {
                const iconSrc = APP_ICONS[app];
                const isActive = app === activeApp;
                const href = getAppUrl(app);
                return (
                  <a
                    key={app}
                    href={href}
                    className={`flex items-center px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-amber/10 text-amber border-r-2 border-amber'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={iconSrc}
                      alt={APP_NAMES[app]}
                      className="h-6 w-6 flex-shrink-0 object-contain"
                    />
                    {sidebarOpen && (
                      <span className="ml-3 text-sm font-medium">{APP_NAMES[app]}</span>
                    )}
                  </a>
                );
              })}
            </>
          )}

          {/* Extra sidebar items (per-app custom menu) */}
          {extraSidebarItems.length > 0 && sidebarOpen && (
            <>
              <div className="border-t border-gray-700/40 my-2" />
              {extraSidebarItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.icon && <span className="mr-3">{item.icon}</span>}
                  {item.label}
                </a>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-700/40 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-amber/20 text-amber flex items-center justify-center font-bold">
              {user?.name?.[0] || user?.email?.[0] || 'U'}
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-400 hover:text-white text-xs"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with app name - removed user avatar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-700/40 bg-[#0A1628]/50">
          <span className="font-heading text-xl text-white">{APP_NAMES[activeApp] || 'Ataqu'}</span>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="text-gray-400 hover:text-white text-sm hidden sm:flex items-center gap-2"
            >
              <span>⌘K</span>
              <span className="text-xs border border-gray-600 rounded px-1">Search</span>
            </Button>
            <div className="h-8 w-px bg-gray-700 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
              onClick={() => {}}
            >
              <span className="sr-only">Notifications</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          <CommandPalette searchFn={searchFn} />
          {children}
        </div>
      </main>
    </div>
  );
};
