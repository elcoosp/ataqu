// apps/aegis/src/routes/_auth/api-keys.tsx


import { createFileRoute } from '@tanstack/react-router';
import { toast } from "sonner";
import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ataqu/ui";

import { EmptyState } from "../../components/empty-state";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Key, Plus, Copy, Check } from 'lucide-react';

export const Route = createFileRoute('/_auth/api-keys')({
  component: () => {
    const queryClient = useQueryClient();
    
    const [openCreate, setOpenCreate] = useState(false);
    const [newKey, setNewKey] = useState<{ id: string; key: string } | null>(null);

    const { data: keys, isLoading, error } = useQuery({
      queryKey: ['aegis', 'api-keys'],
      queryFn: () => api.get<Array<{ id: string; name: string; prefix: string; created_at: string; last_used_at?: string }>>('/aegis/api-keys'),
    });

    const createMutation = useMutation({
      mutationFn: (data: { name: string }) =>
        api.post<{ id: string; key: string }>('/aegis/api-keys', { name: data.name, scopes: [], expires_at: null }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'api-keys'] });
        setOpenCreate(false);
        setNewKey({ id: data.id, key: data.key });
        toast({ title: 'API key created.' });
      },
      onError: (err: any) => {
        toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
      },
    });

    const deleteMutation = useMutation({
      mutationFn: (id: string) =>
        api.delete(`/aegis/api-keys/${id}`, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'api-keys'] });
        toast({ title: 'API key revoked.' });
      },
      onError: (err: any) => {
        toast({ title: 'Revoke failed', description: err.message, variant: 'destructive' });
      },
    });

    const { register, handleSubmit, reset } = useForm<{ name: string }>();

    if (isLoading) {
      return (
        <div className="p-6">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (error) {
      return <div>Error loading API keys.</div>;
    }

    const keyList = keys || [];

    if (keyList.length === 0) {
      return (
        <div className="p-6">
          <EmptyState
            icon={Key}
            title="No API keys"
            description="Generate a key for programmatic access to Ataqu APIs."
            ctaLabel="Create Key"
            onCta={() => setOpenCreate(true)}
          />
          <CreateKeyDialog
            open={openCreate}
            onOpenChange={setOpenCreate}
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
          {newKey && <NewKeyDisplay keyData={newKey} onDismiss={() => setNewKey(null)} />}
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading">
            <Trans>API Keys</Trans>
          </h1>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <Trans>Create Key</Trans>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Trans>Name</Trans></TableHead>
                  <TableHead><Trans>Prefix</Trans></TableHead>
                  <TableHead><Trans>Created</Trans></TableHead>
                  <TableHead><Trans>Last Used</Trans></TableHead>
                  <TableHead><Trans>Actions</Trans></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keyList.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell>{key.prefix}</TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm"><Trans>Revoke</Trans></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle><Trans>Revoke API Key</Trans></DialogTitle>
                            <DialogDescription>
                              <Trans>This action cannot be undone. Any services using this key will lose access.</Trans>
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                              <Trans>Revoke</Trans>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CreateKeyDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
        {newKey && <NewKeyDisplay keyData={newKey} onDismiss={() => setNewKey(null)} />}
      </div>
    );
  },
});

// Create key dialog
function CreateKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string }) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, reset } = useForm<{ name: string }>();

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>Create API Key</Trans></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name"><Trans>Name</Trans></Label>
            <Input id="name" {...register('name', { required: true })} placeholder="My App Key" />
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

// Display newly created key (shown once)
function NewKeyDisplay({ keyData, onDismiss }: { keyData: { id: string; key: string }; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(keyData.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={() => { onDismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>API Key Created</Trans></DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded relative">
            <code className="text-sm break-all">{keyData.key}</code>
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans>Copy this key now. You won't be able to see it again.</Trans>
          </p>
          <Button onClick={onDismiss} className="w-full">
            <Trans>Done</Trans>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
