import { Shell } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarSettings } from '@/components/calendar-settings';

export const Route = createFileRoute('/_auth/calendar-settings')({
  component: CalendarSettingsPage,
});

function CalendarSettingsPage() {
  return (
    <Shell activeApp="tempo">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">
          <Trans>Calendar Settings</Trans>
        </h1>
        <CalendarSettings />
      </div>
    </Shell>
  );
}
