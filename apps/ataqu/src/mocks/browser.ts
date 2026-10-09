import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Browser-side MSW worker. Started by `enableMocking()` in mocks/index.ts
 * before the React app renders, so every query/mutation is served from the
 * seeded in-memory database.
 */
export const worker = setupWorker(...handlers);
