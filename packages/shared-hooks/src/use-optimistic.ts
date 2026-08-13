import { useCallback, useState } from "react";

export const useOptimistic = <T, E = Error>(
	mutationFn: (data: T) => Promise<unknown>,
	options?: {
		onSuccess?: (result: unknown) => void;
		onError?: (error: E) => void;
	},
) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<E | null>(null);

	const mutate = useCallback(
		async (data: T) => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await mutationFn(data);
				options?.onSuccess?.(result);
				return result;
			} catch (err) {
				const e = err as E;
				setError(e);
				options?.onError?.(e);
				throw e;
			} finally {
				setIsLoading(false);
			}
		},
		[mutationFn, options],
	);

	return { mutate, isLoading, error };
};
