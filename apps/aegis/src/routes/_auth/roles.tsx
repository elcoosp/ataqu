// apps/aegis/src/routes/_auth/roles.tsx


import { createFileRoute } from '@tanstack/react-router';
import { toast } from "sonner";
import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ataqu/ui";

import { EmptyState } from "../../components/empty-state";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Shield, Plus } from 'lucide-react';

export const Route = createFileRoute('/_auth/roles')({
  component: () => {
    const queryClient = useQueryClient();
    
    const [openCreate, setOpenCreate] = useState(false);

    const { data: roles, isLoading, error } = useQuery({
      queryKey: ['aegis', 'roles'],
      queryFn: () => api.get<Array<{ id: string; name: string; permissions: string[]; created_at: string }>>('/aegis/roles'),
    });

    const createMutation = useMutation({
      mutationFn: (data: { name: string; permissions: string[] }) =>
        api.post('/aegis/roles', data, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'roles'] });
        setOpenCreate(false);
        toast({ title: 'Role created.' });
      },
      onError: (err: any) => {
        toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
      },
    });

    if (isLoading) {
      return (
        <div className="p-6">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (error) {
      return <div>Error loading roles.</div>;
    }

    const roleList = roles || [];

    if (roleList.length === 0) {
      return (
        <div className="p-6">
          <EmptyState
            icon={Shield}
            title="No roles yet"
            description="Create custom roles to fine-tune permissions."
            ctaLabel="Create Role"
            onCta={() => setOpenCreate(true)}
          />
          <CreateRoleDialog
            open={openCreate}
            onOpenChange={setOpenCreate}
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading">
            <Trans>Roles</Trans>
          </h1>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <Trans>Create Role</Trans>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Trans>Name</Trans></TableHead>
                  <TableHead><Trans>Permissions</Trans></TableHead>
                  <TableHead><Trans>Created</Trans></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleList.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.permissions.join(', ') || '—'}</TableCell>
                    <TableCell>{new Date(role.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CreateRoleDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      </div>
    );
  },
});

// Create role dialog
function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; permissions: string[] }) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, control, reset } = useForm<{ name: string; permissions: string[] }>({
    defaultValues: { permissions: [] },
  });
  const { fields, append, remove } = useFieldArray<{ permissions: string[] }>({
    control,
    name: 'permissions' as const,
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>Create Role</Trans></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name"><Trans>Name</Trans></Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>
          <div>
            <Label><Trans>Permissions</Trans></Label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`permissions.${index}`)}
                    placeholder="e.g., users:read"
                  />
                  <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                    <Trans>Remove</Trans>
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
                <Trans>Add Permission</Trans>
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
