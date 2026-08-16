import { useCallback, useRef, useState } from "react";

export const useOptimistic = <T, E = Error>(
	mutationFn: (data: T) => Promise<unknown>,
	options?: {
		onSuccess?: (result: unknown) => void;
		onError?: (error: E) => void;
	},
) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<E | null>(null);

	// Keep the latest fn/options in refs so `mutate` stays stable across renders
	// and never captures a stale closure.
	const fnRef = useRef(mutationFn);
	fnRef.current = mutationFn;
	const optsRef = useRef(options);
	optsRef.current = options;

	const mutate = useCallback(async (data: T) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await fnRef.current(data);
			optsRef.current?.onSuccess?.(result);
			return result;
		} catch (err) {
			const e = err as E;
			setError(e);
			optsRef.current?.onError?.(e);
			throw e;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { mutate, isLoading, error };
};
