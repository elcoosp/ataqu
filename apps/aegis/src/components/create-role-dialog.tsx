// apps/aegis/src/components/create-role-dialog.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@ataqu/ui";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleFormData {
  name: string;
  permissions: string[];
}

export function CreateRoleDialog({ open, onOpenChange }: CreateRoleDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, reset } = useForm<RoleFormData>({
    defaultValues: { permissions: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'permissions',
  });

  const createMutation = useMutation({
    mutationFn: (data: RoleFormData) =>
      api.post('/aegis/roles', data, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aegis', 'roles'] });
      onOpenChange(false);
      toast.success(<Trans>Role created.</Trans>);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.message || <Trans>Create failed</Trans>);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>Create Role</Trans></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                    {...register(`permissions.${index}` as const)}
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
