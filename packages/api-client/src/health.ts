import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export type HealthStatus = "Nominal" | "Degraded" | "Critical";

export interface OutboxHealth {
	status: HealthStatus;
	lag_seconds: number;
	pending_events: number;
	last_dispatched_at: string | null;
}

export interface SparkWorkflowHealth {
	status: HealthStatus;
	total: number;
	failed_last_hour: number;
	dlq_depth: number;
}

export interface DbPoolHealth {
	used: number;
	max: number;
	waiting: number;
}

export interface SystemHealthComponents {
	outbox: OutboxHealth;
	spark_workflows: SparkWorkflowHealth;
	db_connection_pools: DbPoolHealth;
}

export interface SystemHealth {
	status: HealthStatus;
	timestamp: string;
	components: SystemHealthComponents;
}

/** Fetch the aggregated system health (cached on the server). */
export const getHealth = async (): Promise<SystemHealth> => {
	return api.get<SystemHealth>("/v1/health/status");
};

/** TanStack Query hook for system health. */
export const useHealth = (refetchIntervalMs = 30_000) =>
	useQuery({
		queryKey: ["system-health"],
		queryFn: getHealth,
		refetchInterval: refetchIntervalMs,
		staleTime: refetchIntervalMs / 2,
	});
