import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type ChangelogCategory = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
	id: string;
	version: string;
	date: string;
	title: string;
	description: string;
	category: ChangelogCategory;
	breaking_change: boolean;
}

export interface ChangelogResponse {
	entries: ChangelogEntry[];
	total: number;
}

/** Fetch the changelog (spec 2.12). */
export const getChangelog = async (): Promise<ChangelogResponse> => {
	return api.get<ChangelogResponse>("/v1/changelog");
};

/** Mark changelog entries as read. */
export const markChangelogRead = async (ids: string[]): Promise<void> => {
	await api.post<void>("/v1/changelog/mark-read", { ids });
};

/** TanStack Query hook for the changelog list. */
export const useChangelog = () =>
	useQuery({
		queryKey: ["changelog"],
		queryFn: getChangelog,
		staleTime: 60_000,
	});

/** Mutation that marks the given changelog entries as read. */
export const useMarkChangelogRead = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => markChangelogRead(ids),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["changelog-unread"] });
		},
	});
};
