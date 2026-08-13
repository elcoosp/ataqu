import { generateIdempotencyKey } from "@ataqu/shared-utils";
import { useCallback, useRef } from "react";

export const useIdempotency = () => {
	const keyRef = useRef<string>(generateIdempotencyKey());

	const resetKey = useCallback(() => {
		keyRef.current = generateIdempotencyKey();
	}, []);

	const getKey = useCallback(() => keyRef.current, []);

	return { getKey, resetKey };
};
