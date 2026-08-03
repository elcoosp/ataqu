import { useRef, useCallback } from 'react';
import { generateIdempotencyKey } from '@ataqu/shared-utils';

export const useIdempotency = () => {
  const keyRef = useRef<string>(generateIdempotencyKey());

  const resetKey = useCallback(() => {
    keyRef.current = generateIdempotencyKey();
  }, []);

  const getKey = useCallback(() => keyRef.current, []);

  return { getKey, resetKey };
};
