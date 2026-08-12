import { createFileRoute } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';

export const Route = createFileRoute('/$')({
  component: NotFound,
});

function NotFound() {
  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-2xl font-heading"><Trans>404 – Page not found</Trans></h1>
    </div>
  );
}
