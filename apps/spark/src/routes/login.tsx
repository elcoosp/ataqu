import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { Button, Input, Label } from '@ataqu/ui';
import { useAuthStore } from '@ataqu/shared-stores';
import { AuthLayout } from '@ataqu/ui';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this calls the AEGIS login endpoint
    // For now, simulate login
    login('mock-token', {
      id: 'user-1',
      email,
      tenantId: 'tenant-1',
      roles: ['admin'],
      name: email.split('@')[0],
    });
    navigate({ to: '/' });
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            <Trans>Sign in to SPARK</Trans>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            <Trans>Automation that doesn&apos;t charge per task.</Trans>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email"><Trans>Email</Trans></Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              className="mt-1"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password"><Trans>Password</Trans></Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              className="mt-1"
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          <Trans>Sign In</Trans>
        </Button>
      </form>
    </AuthLayout>
  );
}
