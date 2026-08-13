import { useListAvailabilitySlots } from '@ataqu/api-client';
import type { UUID } from '@ataqu/types';
import { Button, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useTimezone } from '@/hooks/use-timezone';

interface BookingCalendarProps {
  eventTypeId: UUID;
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

export function BookingCalendar({ eventTypeId, selectedSlot, onSelectSlot }: BookingCalendarProps) {
  const timezone = useTimezone();
  const { data: slots, isLoading } = useListAvailabilitySlots(eventTypeId);
  const [visibleDays, setVisibleDays] = useState(7);

  const days = useMemo(() => {
    const result: string[] = [];
    const today = new Date();
    for (let i = 0; i < visibleDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(date.toISOString().slice(0, 10));
    }
    return result;
  }, [visibleDays]);

  const getSlotsForDay = (day: string) => {
    if (!slots) return [];
    return slots.filter((slot) => {
      const slotDate = new Date(slot.start_time);
      return slotDate.toISOString().slice(0, 10) === day && !slot.is_booked;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        <Trans>No available times. Check back soon.</Trans>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-mono">{timezone}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {days.map((day) => {
          const daySlots = getSlotsForDay(day);
          if (daySlots.length === 0) return null;
          return (
            <div key={day} className="ataqu-glass rounded-lg p-4">
              <h3 className="font-heading text-sm font-semibold mb-3 text-foreground">
                {new Date(day).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {daySlots.map((slot) => {
                  const isSelected = selectedSlot === slot.start_time;
                  return (
                    <Button
                      key={slot.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`font-mono text-xs ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 hover:bg-primary/20'
                      }`}
                      onClick={() => onSelectSlot(slot.start_time)}
                    >
                      {new Date(slot.start_time).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {visibleDays < 30 && (
        <Button variant="outline" onClick={() => setVisibleDays((prev) => Math.min(prev + 7, 30))}>
          <Trans>Show more dates</Trans>
        </Button>
      )}
    </div>
  );
}
