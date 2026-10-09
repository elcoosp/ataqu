import type { HttpHandler } from "msw";
import { aegisHandlers } from "./aegis";
import { cinqHandlers } from "./cinq";
import { dialHandlers } from "./dial";
import { pauseHandlers } from "./pause";
import { pivotHandlers } from "./pivot";
import { platformHandlers } from "./platform";
import { sondHandlers } from "./sond";
import { sparkHandlers } from "./spark";
import { tempoHandlers } from "./tempo";
import { vaultHandlers } from "./vault";
import { vistaHandlers } from "./vista";

/**
 * The complete mock API surface (~150 routes) — mirrors the Rust backend's
 * router plus the handful of SPA-intended routes documented in
 * ATAQU_BLUEPRINT.md → "Contract mismatches".
 */
export const handlers: HttpHandler[] = [
	...aegisHandlers,
	...cinqHandlers,
	...dialHandlers,
	...pivotHandlers,
	...sparkHandlers,
	...tempoHandlers,
	...sondHandlers,
	...vaultHandlers,
	...pauseHandlers,
	...vistaHandlers,
	...platformHandlers,
];
