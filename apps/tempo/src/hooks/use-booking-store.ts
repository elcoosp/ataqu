import type { UUID } from '@ataqu/types';
import { create } from 'zustand';

export type BookingScreen = 'event-type' | 'time-slot' | 'guest-form' | 'confirmation';

interface SelectedEventType {
  id: UUID;
  name: string;
  slug: string;
  duration_minutes: number;
  description?: string;
}

interface GuestDetails {
  name: string;
  email: string;
}

interface BookingState {
  eventType: SelectedEventType | null;
  selectedSlot: string | null;
  guestDetails: GuestDetails | null;
  currentScreen: BookingScreen;
  bookingId: UUID | null;
  setEventType: (eventType: SelectedEventType) => void;
  setSelectedSlot: (slot: string | null) => void;
  setGuestDetails: (details: GuestDetails) => void;
  setCurrentScreen: (screen: BookingScreen) => void;
  setBookingId: (bookingId: UUID) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  eventType: null,
  selectedSlot: null,
  guestDetails: null,
  currentScreen: 'event-type',
  bookingId: null,
  setEventType: (eventType) => set({ eventType, currentScreen: 'time-slot' }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setGuestDetails: (guestDetails) => set({ guestDetails }),
  setCurrentScreen: (currentScreen) => set({ currentScreen }),
  setBookingId: (bookingId) => set({ bookingId, currentScreen: 'confirmation' }),
  reset: () =>
    set({
      eventType: null,
      selectedSlot: null,
      guestDetails: null,
      currentScreen: 'event-type',
      bookingId: null,
    }),
}));
