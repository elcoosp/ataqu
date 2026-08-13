// apps/aegis/src/routes/_auth/admin/access-matrix.tsx

import { createFileRoute } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ataqu/ui";
import { toast } from "sonner";;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';

// Apps list
const APPS = ['aegis', 'cinq', 'dial', 'pause', 'pivot', 'sond', 'spark', 'tempo', 'vault', 'vista'];
const ROLES = ['admin', 'editor', 'viewer', 'none'];

export const Route = createFileRoute('/_auth/admin/access-matrix')({
  component: () => {
    const queryClient = useQueryClient();
    

    const { data: matrix, isLoading, error } = useQuery({
      queryKey: ['aegis', 'permission-matrix'],
      queryFn: () => api.get<Array<{ user_id: string; user_name?: string; user_email: string; roles: Record<string, string> }>>('/aegis/permission-matrix'),
    });

    const updatePermissionMutation = useMutation({
      mutationFn: ({ userId, app, role }: { userId: string; app: string; role: string }) =>
        api.patch(`/aegis/permissions/${userId}/${app}`, { role }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'permission-matrix'] });
        toast.success("Permission updated.");
      },
      onError: (err: any) => {
        toast.error("Update failed");
      },
    });

    if (isLoading) {
      return (
        <div className="p-6">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (error || !matrix) {
      return <div>Error loading permission matrix.</div>;
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-heading mb-4">
          <Trans>Access Matrix</Trans>
        </h1>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-deep-night"><Trans>User</Trans></TableHead>
                  {APPS.map((app) => (
                    <TableHead key={app} className="min-w-[100px]">{app}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((entry) => (
                  <TableRow key={entry.user_id}>
                    <TableCell className="sticky left-0 bg-deep-night">
                      <div className="font-medium">{entry.user_name || entry.user_email}</div>
                      <div className="text-xs text-muted-foreground">{entry.user_email}</div>
                    </TableCell>
                    {APPS.map((app) => {
                      const currentRole = entry.roles[app] || 'none';
                      return (
                        <TableCell key={app}>
                          <Select
                            value={currentRole}
                            onValueChange={(role) =>
                              updatePermissionMutation.mutate({ userId: entry.user_id, app, role })
                            }
                          >
                            <SelectTrigger className="w-full min-w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  },
});
