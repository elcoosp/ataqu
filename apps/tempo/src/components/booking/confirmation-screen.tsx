import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useBookingStore } from '@/hooks/use-booking-store';

export function ConfirmationScreen() {
  const { eventType, selectedSlot, guestDetails, reset } = useBookingStore();

  if (!selectedSlot || !eventType) return null;

  const handleAddToCalendar = () => {
    const start = new Date(selectedSlot);
    const end = new Date(start.getTime() + eventType.duration_minutes * 60000);
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${eventType.name}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-heading font-semibold text-foreground">
        <Trans>Meeting booked!</Trans>
      </h2>
      <p className="text-muted-foreground">
        <Trans>A confirmation email has been sent to {guestDetails?.email}.</Trans>
      </p>
      <div className="ataqu-glass rounded-lg p-6">
        <p className="font-heading text-lg font-semibold mb-2 text-foreground">{eventType.name}</p>
        <p className="font-mono text-sm text-muted-foreground mb-4">
          {new Date(selectedSlot).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}{' '}
          {new Date(selectedSlot).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <Button onClick={handleAddToCalendar} variant="outline" className="w-full">
          <Trans>Add to Calendar</Trans>
        </Button>
      </div>
      <Button variant="ghost" onClick={reset}>
        <Trans>Book another meeting</Trans>
      </Button>
    </div>
  );
}
