import { AuthLayout, Button, Input } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: () => (
    <AuthLayout>
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg border border-gray-700/40">
        <h1 className="text-2xl font-heading mb-4">
          <Trans>Login</Trans>
        </h1>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              <Trans>Email</Trans>
            </label>
            <Input id="email" type="email" placeholder={t`you@example.com`} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              <Trans>Password</Trans>
            </label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full bg-amber text-black hover:bg-amber/90">
            <Trans>Sign In</Trans>
          </Button>
        </form>
      </div>
    </AuthLayout>
  ),
});
