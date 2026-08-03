# TASK-033: Frontend SPA — DIAL (Chat & Support)

## Objective
Implement DIAL: channel list, message thread with threads/replies/reactions/mentions, real-time WebSocket messaging, file sharing, search, presence, focus mode, unified support ticket inbox, CINQ integration badge, command palette actions, and micro-tour.

## Execution Boundaries
- `apps/dial/src/routes/_auth.index.tsx`
- `apps/dial/src/routes/_auth.channels.$id.tsx`
- `apps/dial/src/routes/_auth.tickets.index.tsx`
- `apps/dial/src/routes/_auth.tickets.$id.tsx`
- `apps/dial/src/api/`
- `apps/dial/src/components/`
- `apps/dial/src/hooks/`
- `apps/dial/src/stores/`
- `apps/dial/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-dial`, `crates/ataqu-application/src/dial_service.rs`, and `crates/ataqu-api/src/handlers/dial.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Channel`, `Message`, `Thread`, `Reaction`, `Ticket`, `FileAttachment` structs to TypeScript interfaces.
- **API Endpoints**: `GET /channels`, `POST /channels`, `GET /channels/:id/messages`, `POST /channels/:id/messages`, `POST /channels/:id/messages/:id/threads`, `GET /channels/:id/messages/:id/threads`, `POST /channels/:id/messages/:id/reactions`, `GET /channels/:id/files`, `POST /channels/:id/files` (presigned URL), `GET /messages/search?q=`, `GET /tickets`, `PATCH /tickets/:id`, `GET /channels/:id/cinq-context`.
- **WebSocket**: Backend uses native WebSocket (Axum). Connect to `VITE_WS_BASE_URL/ws?token=...`. Message format: `{ type: "message" | "presence" | "reaction" | "thread", channelId, payload }`.
- **Batch Ingestion**: Backend uses `transactional_batch_insert` for message persistence. Frontend sends one message at a time.
- **Presence**: Backend uses `PresenceStore` trait. Frontend receives presence via WebSocket: `{ type: "presence", userId, status: "online" | "away" | "offline" }`.
- **CINQ Context**: If channel has `metadata.cinq_deal_id`, fetch deal info via `GET /channels/:id/cinq-context`.

## UI Contract

### Shell & Layout
- `<Shell activeApp="dial">`.
- Three-column layout: Left = channel list, Center = message thread, Right = context sidebar.

### Channel List (`components/channel-list.tsx`)
- Scrollable list. Public and private channels grouped.
- Each channel: name, unread badge count, last message preview, timestamp.
- Active channel highlighted with `bg-card`.
- Search bar at top: filters channels by name.
- DM section below channels.
- "Create Channel" button opens modal: name, private/public toggle.
- "Create Private Channel" option.
- Presence indicators: green dot (online), gray (offline), amber (away) next to user names in DMs.
- Empty state: `<EmptyState icon={Hash} title="No channels" description="Connect DIAL to CINQ, and we'll auto-create a channel for every active deal." />`.

### Message Thread (`components/message-thread.tsx`)
- Scrollable message list, virtualized with `@tanstack/react-virtual` for > 500 messages.
- Message block: sender name, avatar (square `rounded-md` initials, NOT round), timestamp, content.
- Own messages right-aligned with `bg-primary/10`.
- **Reactions**: hover on message shows reaction picker. Reactions displayed below message as emoji + count. Click to toggle.
- **Threads**: "Reply in thread" button on hover. Opens thread sidebar (right panel). Thread replies shown chronologically. `data-tour="reply-box"` on the thread reply input.
- **Mentions**: `@username` highlighted with `bg-primary/20`. `@channel` highlighted with `bg-destructive/20`. Typing `@` opens user picker dropdown.
- **File Sharing**: paperclip button opens file picker. Request presigned URL from backend, upload directly to S3. Show file preview in message (image thumbnail or file icon + name).
- Infinite scroll: load older messages when scrolling to top.
- `data-tour="context-sidebar"` on the right sidebar.

### Message Input (`components/message-input.tsx`)
- Fixed bottom textarea. Enter to send, Shift+Enter for newline.
- Optimistic UI: message appears instantly with "sending" state. On error, revert and show toast "Message failed to send."
- `Idempotency-Key` header on every message send.
- Character counter if message > 1000 chars.

### WebSocket Hook (`hooks/use-dial-websocket.ts`)
- Connect to `VITE_WS_BASE_URL/ws?token=...`.
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s).
- On message received: update TanStack Query cache (`queryClient.setQueryData`).
- On presence update: update `useDialStore` presence map.
- Connection state in Zustand: `connected`, `reconnecting`, `disconnected`.
- On disconnect: toast "Connection lost. Reconnecting..."
- On reconnect: toast "Reconnected."

### Support Tickets (`tickets.index.tsx` and `tickets.$id.tsx`)
- Table: Subject, Status (open/pending/closed), Priority, Last Message, Customer Email.
- Clicking opens ticket detail: message history (same UI as channel but with ticket context).
- "Reply" box sends message to customer email via backend.
- Status change dropdown: open/pending/closed. Optimistic UI.
- Empty state: `<EmptyState icon={LifeBuoy} title="No support tickets" description="When customers email support, tickets appear here." />`.

### Context Sidebar (`components/context-sidebar.tsx`)
- If channel has `metadata.cinq_deal_id`:
  - Fetch deal info via `GET /channels/:id/cinq-context`.
  - Show `<Badge variant="info">Created from CINQ deal #42</Badge>` with link to `crm.ataqu.com/deals/42`.
  - Show deal summary: name, amount, stage, contact.
- If no CINQ context: show channel info (name, members, created date).

### Focus Mode
- "Toggle Focus Mode" button in header. When enabled: mutes non-mention notifications. Visual indicator: amber dot in header.
- State persisted in `useDialStore`.

### Mark All Read
- "Mark All Read" button in channel header. Calls `POST /channels/:id/mark-read`. Updates unread badge count instantly (optimistic).

### Command Palette Actions (`apps/dial/src/actions.ts`)
Register ALL of these (from `cmd-k-research.md`):
- `Go to [Channel]` → fuzzy search channels, navigate to selected
- `Go to [DM]` → fuzzy search users, navigate to DM
- `Create Channel` → opens channel creation modal
- `Create Private Channel` → opens private channel creation modal
- `Go to Threads` → navigate to threads view
- `Go to Tickets` → navigate to `/tickets`
- `Go to Files` → navigate to files gallery
- `Search Messages` → focuses global search
- `Toggle Focus Mode` → toggles focus mode
- `Mark All Read` → marks current channel as read
- `Set Status` → opens status picker (Online/Away/Offline)
- `Connect to CINQ` → opens CINQ integration setup

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `dial-tickets-tour`
- Trigger: First visit to `/tickets`.
- Steps:
  1. Target `[data-tour="context-sidebar"]` — Content: "Support isn't an island. Customer data from CINQ lives right here." Action: view.
  2. Target `[data-tour="reply-box"]` — Content: "Reply instantly. No Zapier required." Action: click.
- Uses `<OnboardTour>` from `@ataqu/ui`.

### Toasts
- "Message sent." / "Message failed to send."
- "Channel created."
- "Connection lost. Reconnecting..."
- "Reconnected."
- "File uploaded."
- "Ticket closed."
- "Focus mode enabled."
- "All messages marked as read."

### Optimistic UI
- Message send: appears instantly, reverts on error.
- Reaction: toggles instantly.
- Ticket status: changes instantly.
- Mark all read: badges clear instantly.

### Styling
- Dark-mode native. High-density.
- Square avatars (`rounded-md`), NOT round.
- `font-mono` for timestamps.
- NO rounded message bubbles. Messages are flat blocks with border-bottom.
- Skeleton loaders. NO spinners.

## Implementation Plan (Development Script)
1. Create `apps/dial/src/api/types.ts` with `Channel`, `Message`, `Thread`, `Reaction`, `Ticket`, `FileAttachment`, `Presence`.
2. Create `apps/dial/src/api/dial-api.ts`.
3. Create `apps/dial/src/stores/dial-store.ts` (Zustand: active channel, connection state, presence map, focus mode).
4. Create `apps/dial/src/hooks/use-dial-websocket.ts` with auto-reconnect.
5. Create `apps/dial/src/hooks/use-messages.ts` (TanStack Query + WebSocket cache updates).
6. Create `apps/dial/src/components/channel-list.tsx` with unread badges + presence.
7. Create `apps/dial/src/components/message-thread.tsx` (virtualized, reactions, threads).
8. Create `apps/dial/src/components/message-input.tsx` (optimistic send, mentions).
9. Create `apps/dial/src/components/thread-sidebar.tsx`.
10. Create `apps/dial/src/components/file-upload.tsx` (presigned URL).
11. Create `apps/dial/src/components/context-sidebar.tsx` (CINQ deal badge).
12. Create `apps/dial/src/components/ticket-list.tsx` and `ticket-detail.tsx`.
13. Create `apps/dial/src/actions.ts` exporting command palette actions.
14. Implement routes: index (channels), channel detail, tickets index, ticket detail.
15. Add `data-tour` attributes to context sidebar and reply box.
16. Wrap `/tickets` route with `<OnboardTour tourId="dial-tickets-tour" steps={dialTicketsTourSteps}>`.
17. Run scoped frontend gates for `dial`.
18. Commit with `feat(dial): implement chat, WebSocket, threads, reactions, tickets, command palette, tour (baseline)`.

## Definition of Done (DoD)
- [ ] WebSocket auto-reconnects with exponential backoff.
- [ ] Messages send with optimistic UI and revert on error.
- [ ] Message list is virtualized for > 500 messages.
- [ ] Threads work: reply in thread opens sidebar.
- [ ] Reactions toggle with optimistic UI.
- [ ] Mentions highlight and open user picker.
- [ ] File sharing uses presigned URLs.
- [ ] Presence indicators show online/away/offline.
- [ ] Focus mode toggles and persists.
- [ ] CINQ integration badge renders when `metadata.cinq_deal_id` is present.
- [ ] Support tickets have status change with optimistic UI.
- [ ] All 12 command palette actions registered and functional.
- [ ] Micro-tour triggers on first visit to `/tickets`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts are contextual.
- [ ] All mutations include `Idempotency-Key`.
- [ ] No `any` types. `pnpm tsc --noEmit` and `pnpm biome check` pass.
