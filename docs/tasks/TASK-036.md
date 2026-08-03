# TASK-036: Frontend SPA — TEMPO (Scheduling)

## Objective
Implement TEMPO: public booking links, calendar sync (Google/Outlook OAuth), event types (1:1, group), availability configuration, reminders (email/SMS), timezone detection, no-show workflows (WebSocket hook + worker with 15-30 min detection), CRM integration (CINQ activity creation), instant bookings, custom emails, command palette actions.

## Execution Boundaries
- `apps/tempo/src/routes/_auth.index.tsx`
- `apps/tempo/src/routes/_auth.event-types.$id.tsx`
- `apps/tempo/src/routes/_auth.calendar-settings.tsx`
- `apps/tempo/src/routes/book.$slug.tsx`
- `apps/tempo/src/api/`
- `apps/tempo/src/components/`
- `apps/tempo/src/hooks/`
- `apps/tempo/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-tempo`, `crates/ataqu-application/src/tempo_service.rs`, and `crates/ataqu-api/src/handlers/tempo.rs`. You MUST read these to derive:*
- **Entity Types**: Map `EventType`, `Booking`, `Availability`, `Calendar`, `NoShowEvent` structs to TypeScript.
- **API Endpoints**: `GET /event-types`, `POST /event-types`, `PATCH /event-types/:id`, `GET /event-types/:id/availability`, `POST /bookings`, `GET /bookings/:slug` (public), `GET /bookings`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/reschedule`, `GET /calendars`, `POST /oauth/google`, `POST /oauth/outlook`, `POST /bookings/:id/joined` (WebSocket hook for attendance).
- **No-Show Detection** (ADR-032): Backend `no_show_worker` runs every 5 minutes. Uses sargable `ends_at` generated column with 24-hour upper bound. Follow-up sent within 15-30 minutes. Frontend sends `MeetingJoined` WebSocket event when user joins. If hook missed, worker detects via `ends_at < NOW() - 15min`.
- **OAuth**: Backend handles OAuth flow and token refresh saga (ADR-025). Frontend just redirects to `/api/v1/tempo/oauth/google`.
- **CRM Integration**: When booking is created, backend emits `TempoBookingCreatedV1` to outbox. CINQ consumes this to create activity. No frontend action needed.

## UI Contract

### Shell & Layout
- `<Shell activeApp="tempo">` for internal routes.
- NO Shell for public `/book/:slug`.

### Dashboard (`index.tsx`)
- Upcoming meetings list: date, time, attendee, event type, status.
- "Create Event Type" button.
- "Connect Calendar" button (if not connected).
- Empty state: `<EmptyState icon={Calendar} title="No meetings scheduled" description="Connect your calendar and share your booking link." ctaLabel="Create Event Type" />`.

### Event Type Config (`event-types.$id.tsx`)
- Form: name, duration (15/30/60 min), description, location (video/link), availability window (days + time slots), buffer time before/after.
- "Generate Booking Link" button. Shows link with copy button.
- Event type type: 1:1 or group.
- Reminders: toggle email reminder, toggle SMS reminder. Time selector (1 hour before, 1 day before).
- Custom emails: invitation template, reminder template. Use `textarea` with variable hints ({name}, {date}, {time}).
- "Save" with `Idempotency-Key`.

### Calendar Settings (`calendar-settings.tsx`)
- "Connect Google Calendar" button → redirect to `/api/v1/tempo/oauth/google`.
- "Connect Outlook Calendar" button → redirect to `/api/v1/tempo/oauth/outlook`.
- List connected calendars: name, sync status, last synced.
- "Disconnect" button per calendar.
- "Sync Now" button.

### Public Booking Page (`book.$slug.tsx`)
- NO Shell. Centered, clean layout.
- Display event type name, duration, description.
- Calendar grid: show available time slots for next 30 days.
- **Timezone detection**: auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Show timezone selector dropdown.
- Form: name, email. "Book" button.
- `POST /bookings` with `Idempotency-Key` (prevent double-booking on double-click).
- On success: confirmation screen with meeting details + "Add to Calendar" button.
- On no availability: "No available times. Check back soon."

### No-Show Workflow
- When meeting starts, frontend sends `MeetingJoined` WebSocket event to `POST /bookings/:id/joined`.
- If user doesn't join within 15 minutes of start time, backend `no_show_worker` detects and sends follow-up email.
- Frontend shows "No-show detected" badge on booking if `no_show_detected: true`.
- "Reschedule" button on booking detail: opens reschedule modal.

### Command Palette Actions (`apps/tempo/src/actions.ts`)
- `Create Event Type` → opens new event type modal
- `Go to Event Types` → navigate to `/`
- `Go to Meetings` → navigate to `/`
- `Go to Calendar Settings` → navigate to `/calendar-settings`
- `Connect Google Calendar` → initiates OAuth
- `Connect Outlook Calendar` → initiates OAuth
- `Create Booking Link` → generates new link
- `Search Meetings` → search past/upcoming
- `Cancel Meeting` → only when viewing a meeting
- `Reschedule Meeting` → only when viewing a meeting

### Toasts
- "Event type created." / "Booking link generated."
- "Calendar connected." / "Calendar disconnected."
- "Meeting booked." / "Meeting canceled."
- "Meeting rescheduled."
- "No-show detected. Follow-up sent."

### Optimistic UI
- Booking creation: confirmation shows instantly, reverts on error.
- Cancel: removes from list instantly.
- Calendar connect: status changes to "connected" instantly.

### Styling
- Dark-mode native for internal.
- Public booking page: clean, centered, `max-w-md`. Same dark theme.
- Calendar grid: `bg-card` cells, `bg-primary` for selected slot.
- `font-mono` for times.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `event-type-form.tsx` (duration, availability, reminders, custom emails).
3. Create `booking-calendar.tsx` (time slot picker, timezone detection).
4. Create `upcoming-meetings.tsx`.
5. Create `calendar-settings.tsx` (OAuth buttons, sync status).
6. Create `public-booking-page.tsx` (NO Shell).
7. Create `no-show-badge.tsx` (displays when `no_show_detected: true`).
8. Create `apps/tempo/src/actions.ts`.
9. Implement routes: index, event type detail, calendar settings, public booking.
10. Run gates, commit.

## Definition of Done (DoD)
- [ ] Time slots render based on backend availability.
- [ ] Timezone auto-detection works.
- [ ] Booking mutation is idempotent (includes `Idempotency-Key`).
- [ ] Calendar OAuth redirect works.
- [ ] No-show badge displays when detected.
- [ ] Reschedule modal works.
- [ ] Reminders can be toggled.
- [ ] Custom email templates accept variables.
- [ ] All 10 command palette actions registered.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] No `any` types. Gates pass.
