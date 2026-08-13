import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { BookingCalendar } from '@/components/booking-calendar';
import { useBookingStore } from '@/hooks/use-booking-store';

export function TimeSlotPicker() {
  const eventType = useBookingStore((state) => state.eventType);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const setSelectedSlot = useBookingStore((state) => state.setSelectedSlot);
  const setCurrentScreen = useBookingStore((state) => state.setCurrentScreen);

  if (!eventType) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-semibold text-foreground">{eventType.name}</h2>
      <p className="text-muted-foreground font-mono">{eventType.duration_minutes} min</p>
      <BookingCalendar
        eventTypeId={eventType.id}
        selectedSlot={selectedSlot}
        onSelectSlot={setSelectedSlot}
      />
      {selectedSlot && (
        <Button onClick={() => setCurrentScreen('guest-form')} className="w-full">
          <Trans>Continue</Trans>
        </Button>
      )}
    </div>
  );
}
