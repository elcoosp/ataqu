// apps/aegis/src/components/create-role-dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ataqu/ui';
import { Button, Input, Label } from '@ataqu/ui';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { toast } from 'sonner';
import { api } from '@ataqu/api-client';
import { useState } from 'react';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newPerm, setNewPerm] = useState('');
  const { register, handleSubmit, reset } = useForm<{ name: string }>();

  const addPermission = () => {
    if (newPerm.trim()) {
      setPermissions([...permissions, newPerm.trim()]);
      setNewPerm('');
    }
  };

  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) =>
      api.post('/aegis/roles', data, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aegis', 'roles'] });
      onOpenChange(false);
      toast.success(<Trans>Role created.</Trans>);
      reset();
      setPermissions([]);
    },
    onError: (err: any) => {
      toast.error(err.message || <Trans>Create failed</Trans>);
    },
  });

  const onSubmit = (data: { name: string }) => {
    createMutation.mutate({ name: data.name, permissions });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {permissions.map((perm, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={perm} disabled />
                  <Button type="button" variant="destructive" size="sm" onClick={() => removePermission(idx)}>
                    <Trans>Remove</Trans>
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newPerm}
                  onChange={(e) => setNewPerm(e.target.value)}
                  placeholder="e.g., users:read"
                />
                <Button type="button" variant="outline" size="sm" onClick={addPermission}>
                  <Trans>Add</Trans>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
