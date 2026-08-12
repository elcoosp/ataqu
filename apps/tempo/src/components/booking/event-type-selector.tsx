import { useListEventTypes } from '@ataqu/api-client';
import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useBookingStore } from '@/hooks/use-booking-store';

export function EventTypeSelector() {
  const { data: eventTypesData } = useListEventTypes();
  const setEventType = useBookingStore((state) => state.setEventType);

  const eventTypes = eventTypesData?.items ?? [];

  if (eventTypes.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        <Trans>No event types available.</Trans>
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {eventTypes.map((eventType) => (
        <div
          key={eventType.id}
          className="ataqu-glass rounded-lg p-6 hover:border-primary transition-colors"
        >
          <h3 className="font-heading text-lg font-semibold mb-2 text-foreground">
            {eventType.name}
          </h3>
          <span className="inline-block bg-primary/10 text-primary text-xs font-mono px-2 py-1 rounded mb-2">
            {eventType.duration_minutes} min
          </span>
          {eventType.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
              {eventType.description}
            </p>
          )}
          <Button onClick={() => setEventType(eventType)}>
            <Trans>Select</Trans>
          </Button>
        </div>
      ))}
    </div>
  );
}
