// apps/aegis/src/routes/_auth/settings.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Skeleton, toast } from '@ataqu/ui';
import { api } from '@ataqu/api-client';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import QRCode from 'qrcode.react';

export const Route = createFileRoute('/_auth/settings')({
  component: () => {
    const queryClient = useQueryClient();
    const { toast } = toast();
    const [mfaSecret, setMfaSecret] = useState<string | null>(null);
    const [mfaQrUrl, setMfaQrUrl] = useState<string | null>(null);
    const [mfaVerificationCode, setMfaVerificationCode] = useState('');

    const { data: tenant, isLoading, error } = useQuery({
      queryKey: ['aegis', 'tenant'],
      queryFn: () => api.get<{ id: string; name: string; plan: string }>('/aegis/tenant'),
    });

    const updateTenantMutation = useMutation({
      mutationFn: (data: { name: string }) =>
        api.patch('/aegis/tenant/settings', data, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['aegis', 'tenant'] });
        toast({ title: 'Settings updated.' });
      },
      onError: (err: any) => {
        toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
      },
    });

    const { register, handleSubmit } = useForm<{ name: string }>({
      values: tenant ? { name: tenant.name } : { name: '' },
    });

    const setupMfaMutation = useMutation({
      mutationFn: () => api.post<{ secret: string; qr_code_url: string }>('/aegis/mfa/setup', {}, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: (data) => {
        setMfaSecret(data.secret);
        setMfaQrUrl(data.qr_code_url);
        toast({ title: 'MFA setup initiated. Scan the QR code.' });
      },
      onError: (err: any) => {
        toast({ title: 'MFA setup failed', description: err.message, variant: 'destructive' });
      },
    });

    const verifyMfaMutation = useMutation({
      mutationFn: (code: string) =>
        api.post('/aegis/mfa/verify', { code }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
      onSuccess: () => {
        setMfaSecret(null);
        setMfaQrUrl(null);
        toast({ title: 'MFA enabled.' });
      },
      onError: (err: any) => {
        toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
      },
    });

    if (isLoading) {
      return (
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (error || !tenant) {
      return <div>Error loading settings.</div>;
    }

    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-heading mb-6">
          <Trans>Settings</Trans>
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle><Trans>Tenant Information</Trans></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => updateTenantMutation.mutate(data))} className="space-y-4">
              <div>
                <Label htmlFor="name"><Trans>Tenant Name</Trans></Label>
                <Input id="name" {...register('name')} />
              </div>
              <div>
                <Label><Trans>Plan</Trans></Label>
                <p className="text-lg font-medium">{tenant.plan}</p>
              </div>
              <Button type="submit" disabled={updateTenantMutation.isPending}>
                {updateTenantMutation.isPending ? <Trans>Saving...</Trans> : <Trans>Save</Trans>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle><Trans>Multi-Factor Authentication (MFA)</Trans></CardTitle>
          </CardHeader>
          <CardContent>
            {!mfaSecret ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  <Trans>Secure your account with TOTP MFA. You'll need an authenticator app like Google Authenticator or Authy.</Trans>
                </p>
                <Button onClick={() => setupMfaMutation.mutate()} disabled={setupMfaMutation.isPending}>
                  {setupMfaMutation.isPending ? <Trans>Setting up...</Trans> : <Trans>Setup MFA</Trans>}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {mfaQrUrl && (
                    <QRCode value={mfaQrUrl} size={200} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <Trans>Scan this QR code with your authenticator app, then enter the 6-digit code below to verify.</Trans>
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="123456"
                    value={mfaVerificationCode}
                    onChange={(e) => setMfaVerificationCode(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    onClick={() => verifyMfaMutation.mutate(mfaVerificationCode)}
                    disabled={verifyMfaMutation.isPending || mfaVerificationCode.length !== 6}
                  >
                    {verifyMfaMutation.isPending ? <Trans>Verifying...</Trans> : <Trans>Verify</Trans>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><Trans>IP Allowlist</Trans></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <Trans>Restrict access to your tenant to specific IP addresses. (P1 feature - coming soon)</Trans>
            </p>
            <Button disabled className="mt-2">
              <Trans>Configure (Coming Soon)</Trans>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  },
});
