# TASK-033: Frontend SPA: DIAL (Chat)

## Execution Boundaries
 - `apps/dial/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read the injected backend files (`dial_service.rs`, `handlers/dial.rs`, `contracts/dial.rs`). Note the WebSocket endpoint.\n2. **Routing**: TanStack Router for `/channels/:id`.\n3. **Channel List**: Sidebar component listing channels.\n4. **Message View**: Implement infinite scroll using TanStack Virtual. Render messages, emojis, and reactions.\n5. **WebSocket Integration**: Write a custom hook `useWebSocket` that connects to the Axum WS endpoint. On receiving a message, update the TanStack Query cache. Handle disconnect/reconnect logic.\n6. **Threads**: Implement a thread reply sidebar view.\n7. **File Sharing**: Implement file upload UI (request presigned URL from backend, upload directly to S3).\n8. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n9. **Idempotency**: Sending messages must include `Idempotency-Key` to prevent duplicates on retry.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] WebSocket updates UI instantly without re-fetching.\n- [ ] Infinite scroll does not lag with 5000 messages.
