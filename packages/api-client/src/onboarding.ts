import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type OnboardingTaskStatus = "pending" | "completed";

export interface OnboardingTask {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	completed_at: string | null;
}

export interface TeamMemberActivation {
	user_id: string;
	full_name: string;
	email: string;
	activated: boolean;
	last_active_at: string | null;
}

export interface OnboardingStatus {
	tenant_id: string;
	tasks: OnboardingTask[];
	setup_complete: boolean;
	activation_rate: number; // 0..1
	last_activity_at: string | null;
}

export interface TeamStatus {
	members: TeamMemberActivation[];
	activation_rate: number; // 0..1
	total: number;
	activated: number;
}

/** Fetch the current tenant's onboarding setup status (spec 2.10). */
export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
	return api.get<OnboardingStatus>("/v1/onboarding/status");
};

/** Mark a single onboarding task complete. */
export const completeOnboardingTask = async (taskId: string): Promise<void> => {
	await api.post<void>("/v1/onboarding/task-complete", { task_id: taskId });
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
