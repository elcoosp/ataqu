import { usePublicCreateBooking } from '@ataqu/api-client';
import { Button, Input, Label } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import React, { useState } from 'react';
import { useBookingStore } from '@/hooks/use-booking-store';
import { useTimezone } from '@/hooks/use-timezone';

export function GuestForm() {
  const timezone = useTimezone();
  const { eventType, selectedSlot, setGuestDetails, setBookingId, setCurrentScreen } =
    useBookingStore();
  const createBookingMutation = usePublicCreateBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType || !selectedSlot) return;
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const tenantId = '00000000-0000-0000-0000-000000000000';
      const result = await createBookingMutation.mutateAsync({
        tenantId,
        data: {
          slug: eventType.slug,
          starts_at: selectedSlot,
          timezone,
          invitee_name: name.trim(),
          invitee_email: email.trim(),
        },
      });
      setGuestDetails({ name: name.trim(), email: email.trim() });
      setBookingId(result.id);
    } catch {
      setError('This slot is no longer available. Please select another.');
      setCurrentScreen('time-slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-heading font-semibold text-foreground">
        <Trans>Enter your details</Trans>
      </h2>
      <div>
        <Label htmlFor="guest-name">
          <Trans>Name</Trans>
        </Label>
        <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="guest-email">
          <Trans>Email</Trans>
        </Label>
        <Input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Trans>Booking...</Trans> : <Trans>Book</Trans>}
      </Button>
    </form>
  );
}
