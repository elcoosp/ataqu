import type { QueryKey } from "@tanstack/react-query";
import {
	type UseMutationResult,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";

export interface OptimisticMutationOptions<
	TData,
	TOld = unknown,
	TVars = TData,
> {
	/** Query key whose cached value this mutation paints optimistically. */
	listQueryKey: readonly unknown[];
	/** Returns the optimistic next state from the previous cache value. */
	optimisticUpdate: (old: TOld, vars: TVars) => TOld;
	mutationFn: (data: TVars) => Promise<TData>;
	/**
	 * Optional merge of the server's authoritative value into the cache after
	 * success (e.g. replacing the temp row with the server's version). When
	 * omitted, the cache is left as optimistically painted and invalidated on
	 * settle.
	 */
	mergeServer?: (old: TOld, server: TData) => TOld;
	/** Also invalidate these keys on settle (default: only listQueryKey). */
	invalidateKeys?: unknown[][];
	/** Called after rollback on failure — surface a toast here. */
	onError?: (error: unknown, vars: TVars) => void;
	/** Called after commit on success. Receives the snapshot context from onMutate. */
	onSuccess?: (
		data: TData,
		vars: TVars,
		context: { previous: TOld | undefined } | undefined,
	) => void;
}

/**
 * Optimistic mutation kit (P1): snapshot → paint cache → rollback on failure,
 * with ConflictError (409/412) surfaced for "reload & merge" UX.
 *
 * Replaces ad-hoc onMutate/onError cache juggling per domain.
 */
export function useOptimisticMutation<TData, TOld = unknown, TVars = TData>({
	listQueryKey,
	optimisticUpdate,
	mutationFn,
	mergeServer,
	invalidateKeys,
	onError,
	onSuccess,
}: OptimisticMutationOptions<TData, TOld, TVars>): UseMutationResult<
	TData,
	Error,
	TVars
> {
	const queryClient = useQueryClient();
	// useMutation manages its own lifecycle; the optimistic paint is a pure
	// function of (old cache, vars) so no manual snapshot refs are needed.
	return useMutation<TData, Error, TVars, { previous: TOld | undefined }>({
		mutationFn,
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey: listQueryKey });
			const previous = queryClient.getQueryData<TOld>(listQueryKey);
			if (previous !== undefined) {
				queryClient.setQueryData(
					listQueryKey,
					optimisticUpdate(previous, vars),
				);
			}
			return { previous };
		},
		onError: (error, vars, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(listQueryKey, context.previous);
			}
			onError?.(error, vars);
		},
		onSuccess: (data, vars, context) => {
			if (mergeServer) {
				queryClient.setQueryData(listQueryKey, (old: TOld | undefined) =>
					old === undefined ? old : mergeServer(old, data),
				);
			}
			onSuccess?.(data, vars, context);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: listQueryKey });
			for (const key of invalidateKeys ?? []) {
				queryClient.invalidateQueries({ queryKey: key });
			}
		},
	});
}
