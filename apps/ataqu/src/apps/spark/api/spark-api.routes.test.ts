import { afterEach, describe, expect, it, vi } from "vitest";
import {
	approveWorkflowRun,
	deleteDLQ,
	deleteWorkflow,
	getWorkflow,
	getWorkflowRun,
	listDLQ,
	listWorkflowRuns,
	listWorkflows,
	replayDLQ,
} from "./spark-api";

describe("Spark API route mounting", () => {
	afterEach(() => vi.unstubAllGlobals());

	it.each([
		["list workflows", () => listWorkflows(), "GET", "/api/spark/workflows"],
		[
			"get workflow",
			() => getWorkflow("workflow-id"),
			"GET",
			"/api/spark/workflows/workflow-id",
		],
		[
			"delete workflow",
			() => deleteWorkflow("workflow-id"),
			"DELETE",
			"/api/spark/workflows/workflow-id",
		],
		["list runs", () => listWorkflowRuns(), "GET", "/api/spark/workflows/runs"],
		[
			"get run",
			() => getWorkflowRun("run-id"),
			"GET",
			"/api/spark/workflows/runs/run-id",
		],
		[
			"approve run",
			() => approveWorkflowRun("run-id"),
			"POST",
			"/api/spark/workflows/runs/run-id/approve",
		],
		["list DLQ", () => listDLQ(), "GET", "/api/spark/dlq"],
		[
			"replay DLQ",
			() => replayDLQ("entry-id"),
			"POST",
			"/api/spark/dlq/entry-id/replay",
		],
		[
			"delete DLQ",
			() => deleteDLQ("entry-id"),
			"DELETE",
			"/api/spark/dlq/entry-id",
		],
	] as const)(
		"%s uses the mounted Spark API",
		async (_name, call, method, path) => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(new Response("{}", { status: 200 }));
			vi.stubGlobal("fetch", fetchMock);
			await call();
			expect(fetchMock).toHaveBeenCalledWith(
				path,
				expect.objectContaining({ method }),
			);
		},
	);
});
