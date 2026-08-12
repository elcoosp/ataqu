import { Button, Shell } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { EventTypeForm } from '@/components/event-type-form';
import { RescheduleModal } from '@/components/reschedule-modal';
import { UpcomingMeetings } from '@/components/upcoming-meetings';

export const Route = createFileRoute('/_auth/')({
  component: Dashboard,
});

function Dashboard() {
  const [showEventTypeForm, setShowEventTypeForm] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [rescheduleEventTypeId, setRescheduleEventTypeId] = useState<string | null>(null);

  const handleReschedule = (bookingId: string, eventTypeId: string) => {
    setRescheduleBookingId(bookingId);
    setRescheduleEventTypeId(eventTypeId);
  };

  return (
    <ErrorBoundary>
      <Shell activeApp="tempo">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              <Trans>Dashboard</Trans>
            </h1>
            <div className="flex gap-2">
              <Button onClick={() => setShowEventTypeForm(true)}>
                <Trans>Create Event Type</Trans>
              </Button>
              <Button variant="outline">
                <Trans>Connect Calendar</Trans>
              </Button>
            </div>
          </div>

          {showEventTypeForm && (
            <div className="ataqu-glass rounded-lg p-6">
              <EventTypeForm onSuccess={() => setShowEventTypeForm(false)} />
            </div>
          )}

          <UpcomingMeetings onReschedule={handleReschedule} />

          {rescheduleBookingId && rescheduleEventTypeId && (
            <RescheduleModal
              bookingId={rescheduleBookingId}
              eventTypeId={rescheduleEventTypeId}
              open={!!rescheduleBookingId}
              onOpenChange={(open) => {
                if (!open) {
                  setRescheduleBookingId(null);
                  setRescheduleEventTypeId(null);
                }
              }}
            />
          )}
        </div>
      </Shell>
    </ErrorBoundary>
  );
}
