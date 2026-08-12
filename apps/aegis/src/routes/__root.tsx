// apps/aegis/src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@ataqu/ui";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Avatar, AvatarFallback, AvatarImage } from "@ataqu/ui";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@ataqu/shared-i18n';
import { Shell } from '@ataqu/ui';
import { useAuthStore } from '../stores/auth-store';
import { registerAegisActions } from '../actions';
import { useState, useEffect } from 'react';
import { InviteDialog } from '../components/invite-dialog';
import { CreateApiKeyDialog } from '../components/create-api-key-dialog';
import { CreateRoleDialog } from '../components/create-role-dialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  component: () => {
    const { user } = useAuthStore();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [apiKeyOpen, setApiKeyOpen] = useState(false);
    const [roleOpen, setRoleOpen] = useState(false);

    useEffect(() => {
      const actions = registerAegisActions(
        () => setInviteOpen(true),
        () => setApiKeyOpen(true),
        () => setRoleOpen(true)
      );
      // Register with global command palette store (if exists)
      
    }, []);

    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <Shell activeApp="aegis">
            <Outlet />
            <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
            <CreateApiKeyDialog open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
            <CreateRoleDialog open={roleOpen} onOpenChange={setRoleOpen} />
          </Shell>
        </I18nProvider>
      </QueryClientProvider>
    );
  },
});
