// apps/aegis/src/routes/_auth/users.$id.tsx


import { Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Skeleton } from "@ataqu/ui";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_auth/users/$id')({
  component: () => {
    const { id } = useParams({ from: '/_auth/users/$id' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    

    const { data: user, isLoading, error } = useQuery({
      queryKey: ['aegis', 'users', id],
      queryFn: async () => {
        const users = await api.get<Array<{ id: string; email: string; name?: string; role: string; is_active: boolean; mfa_enabled: boolean; last_login_at?: string; created_at: string; version: number }>>('/aegis/users');
        return users.find(u => u.id === id);
      },
      enabled: !!id,
    });

    const deactivateMutation = useMutation({
      mutationFn: (userId: string) =>
        api.post(`/aegis/users/${userId}/deactivate`, {}, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'users'] });
        toast({ title: 'User deactivated.' });
        navigate({ to: '/users' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to deactivate', description: err.message, variant: 'destructive' });
      },
    });

    if (isLoading) {
      return (
        <div className="p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (error || !user) {
      return <div>User not found.</div>;
    }

    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/users' })} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <Trans>Back to Users</Trans>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{user.name || user.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><strong><Trans>Email:</Trans></strong> {user.email}</div>
            <div><strong><Trans>Role:</Trans></strong> {user.role}</div>
            <div>
              <strong><Trans>Status:</Trans></strong>
              {user.is_active ? (
                <span className="text-green-500 ml-2"><Trans>Active</Trans></span>
              ) : (
                <span className="text-red-500 ml-2"><Trans>Inactive</Trans></span>
              )}
            </div>
            <div><strong><Trans>MFA Enabled:</Trans></strong> {user.mfa_enabled ? 'Yes' : 'No'}</div>
            <div><strong><Trans>Last Login:</Trans></strong> {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</div>
            <div><strong><Trans>Created:</Trans></strong> {new Date(user.created_at).toLocaleString()}</div>

            {user.is_active && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive"><Trans>Revoke Access</Trans></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle><Trans>Revoke Access</Trans></DialogTitle>
                    <DialogDescription>
                      <Trans>This will deactivate the user and revoke all sessions. This action can be undone by an admin.</Trans>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                      <Trans>Revoke</Trans>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
