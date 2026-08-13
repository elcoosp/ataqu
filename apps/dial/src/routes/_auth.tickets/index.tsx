import { useOnboardingStore } from '@ataqu/shared-stores';
import { OnboardTour } from '@ataqu/ui';
import { createFileRoute } from '@tanstack/react-router';
import { TicketList } from '@/components/ticket-list';

const tourSteps = [
  {
    selector: '[data-tour="context-sidebar"]',
    content: "Support isn't an island. Customer data from CINQ lives right here.",
    title: 'CINQ Integration',
  },
  {
    selector: '[data-tour="reply-box"]',
    content: 'Reply instantly. No Zapier required.',
    title: 'Reply to Customers',
  },
];

export const Route = createFileRoute('/_auth/tickets/')({
  component: TicketsIndex,
});

function TicketsIndex() {
  const { isCompleted: _isCompleted } = useOnboardingStore();
  const tourId = 'dial-tickets-tour';

  return (
    <OnboardTour tourId={tourId} steps={tourSteps}>
      <div className="h-full p-4">
        <h1 className="text-2xl font-semibold mb-4">Support Tickets</h1>
        <TicketList />
      </div>
    </OnboardTour>
  );
}
