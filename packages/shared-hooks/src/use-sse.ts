import { useEffect, useState, useRef, useCallback } from 'react';

export interface SSEOptions {
  onMessage?: (data: unknown) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event) => void;
  retryInterval?: number;
}

export const useSSE = <T = unknown>(
  url: string | null,
  options: SSEOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { onMessage, onError, onOpen, retryInterval = 3000 } = options;

  const connect = useCallback(() => {
    if (!url) return;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = (event) => {
      setIsConnected(true);
      onOpen?.(event);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        setData(parsed);
        onMessage?.(parsed);
      } catch {
        setData(event.data as T);
        onMessage?.(event.data);
      }
    };

    es.onerror = (event) => {
      setIsConnected(false);
      onError?.(event);
      // EventSource will automatically reconnect
    };
  }, [url, onMessage, onError, onOpen]);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      close();
    };
  }, [connect, close]);

  return { data, isConnected, close };
};
