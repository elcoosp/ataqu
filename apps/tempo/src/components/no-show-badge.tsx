import { Badge } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';

export function NoShowBadge() {
  return (
    <Badge variant="destructive">
      <Trans>No-show detected</Trans>
    </Badge>
  );
}
