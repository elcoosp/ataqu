import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout, OnboardTour } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { DealKanban } from '../components/deal-kanban';

export const Route = createFileRoute('/_auth/deals/')({
  component: DealsIndex,
});

const tourSteps = [
  {
    selector: '[data-tour="kanban-board"]',
    content: <Trans>This is your revenue engine. No 3‑year lock‑in, just deals.</Trans>,
  },
  {
    selector: '[data-tour="deal-card"]',
    content: <Trans>Drag this to 'Won' to trigger native automations across the OS.</Trans>,
  },
];

function DealsIndex() {
  return (
    <OnboardTour tourId="cinq-kanban-tour" steps={tourSteps}>
      <DashboardLayout>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4"><Trans>Deals</Trans></h1>
          <DealKanban />
        </div>
      </DashboardLayout>
    </OnboardTour>
  );
}
