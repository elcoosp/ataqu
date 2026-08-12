import { Trans } from '@lingui/react/macro';

interface DatabaseGridProps {
  databaseId: string;
}

export function DatabaseGrid({ databaseId }: DatabaseGridProps) {
  return (
    <div className="border border-border rounded p-4 text-muted-foreground">
      <Trans>Database grid will be implemented with inline editing and relation columns.</Trans>
      <p className="text-xs mt-2">Database ID: {databaseId}</p>
    </div>
  );
}
