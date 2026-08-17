import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type ChangelogCategory = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
	id: number;
	version: string;
	date: string;
	title: string;
	description: string;
	category: ChangelogCategory;
	breaking_change: boolean;
}

/** Fetch the changelog (spec 2.12). Returns a bare array of entries. */
export const getChangelog = async (): Promise<ChangelogEntry[]> => {
	return api.get<ChangelogEntry[]>("/v1/changelog");
};

/** Mark all changelog entries as read for the current user. No body required. */
export const markChangelogRead = async (): Promise<void> => {
	await api.post<void>("/v1/changelog/mark-read");
};

/** TanStack Query hook for the changelog list. */
export const useChangelog = () =>
	useQuery({
		queryKey: ["changelog"],
		queryFn: getChangelog,
		staleTime: 60_000,
	});

/** Mutation that marks the changelog as read for the current user. */
export const useMarkChangelogRead = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => markChangelogRead(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["changelog-unread"] });
		},
	});
};
