import { Trans } from '@lingui/react/macro';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/dashboard')({
  component: () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-heading">
        <Trans>Dashboard</Trans>
      </h1>
      <p className="text-gray-400 mt-2">
        <Trans>Welcome to your workspace</Trans>
      </p>
    </div>
  ),
});
