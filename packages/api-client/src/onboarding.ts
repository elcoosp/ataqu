import { useAuthStore } from "@ataqu/shared-stores";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface OnboardingStatus {
	tenant_id: string;
	/** Ids of tasks the tenant has completed. */
	tasks_completed: string[];
	last_active_at: string | null;
	progress_percentage: number;
}

export interface TeamStatusUser {
	user_id: string;
	name: string | null;
	email: string;
	last_login_at: string | null;
	role: string;
	is_active: boolean;
}

export interface TeamStatus {
	users: TeamStatusUser[];
	tenant_progress: number;
}

/** Fetch the current tenant's onboarding setup status (spec 2.10). */
export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
	const tenantId = useAuthStore.getState().tenantId;
	const qs = tenantId ? `?tenant_id=${tenantId}` : "";
	return api.get<OnboardingStatus>(`/v1/onboarding/status${qs}`);
};

/** Mark a single onboarding task complete (requires tenant_id in the body). */
export const completeOnboardingTask = async (taskId: string): Promise<void> => {
	const tenantId = useAuthStore.getState().tenantId;
	await api.post<void>("/v1/onboarding/task-complete", {
		tenant_id: tenantId,
		task_id: taskId,
	});
};

/** Fetch team activation status (admin). */
export const getTeamStatus = async (): Promise<TeamStatus> => {
	return api.get<TeamStatus>("/v1/onboarding/team-status");
};

export const useOnboardingStatus = () =>
	useQuery({
		queryKey: ["onboarding-status"],
		queryFn: getOnboardingStatus,
		staleTime: 30_000,
	});

export const useCompleteOnboardingTask = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (taskId: string) => completeOnboardingTask(taskId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["onboarding-status"] });
		},
	});
};

export const useTeamStatus = () =>
	useQuery({
		queryKey: ["team-status"],
		queryFn: getTeamStatus,
		staleTime: 30_000,
	});
