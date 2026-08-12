// apps/aegis/src/routes/_auth/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@ataqu/ui";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Avatar, AvatarFallback, AvatarImage } from "@ataqu/ui";
import { useQuery } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@ataqu/ui';
import { api } from '@ataqu/api-client';
import { Users, Key, Building2, LayoutGrid } from 'lucide-react';

export const Route = createFileRoute('/_auth/dashboard')({
  component: () => {
    const { data: tenant, isLoading, error } = useQuery({
      queryKey: ['aegis', 'tenant'],
      queryFn: () => api.get<{ id: string; name: string; plan: string; userCount: number; apiKeyCount: number }>('/aegis/tenant'),
    });

    if (isLoading) {
      return (
        <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return <div>Error loading tenant info.</div>;
    }

    if (!tenant) return null;

    return (
      <div className="p-6">
        <h1 className="text-3xl font-heading mb-6">
          <Trans>Dashboard</Trans>
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Trans>Tenant</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{tenant.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Trans>Plan:</Trans> {tenant.plan}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Trans>Users</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{tenant.userCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Trans>API Keys</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{tenant.apiKeyCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Trans>Quick Links</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href="/users" className="text-sm text-primary hover:underline block">
                <Trans>Manage Users</Trans>
              </a>
              <a href="/roles" className="text-sm text-primary hover:underline block">
                <Trans>Manage Roles</Trans>
              </a>
              <a href="/api-keys" className="text-sm text-primary hover:underline block">
                <Trans>API Keys</Trans>
              </a>
              <a href="/admin/access-matrix" className="text-sm text-primary hover:underline block">
                <Trans>Access Matrix</Trans>
              </a>
              <a href="/admin/audit" className="text-sm text-primary hover:underline block">
                <Trans>Audit Log</Trans>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
});
