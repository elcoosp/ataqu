import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const useVistaSSE = (url: string | null) => {
	const queryClient = useQueryClient();
	const [isConnected, setIsConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);

	const connect = useCallback(() => {
		if (!url) return;
		const es = new EventSource(url);
		eventSourceRef.current = es;

		es.onopen = () => {
			setIsConnected(true);
			toast.success("Live data connected.");
		};

		es.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data);
				queryClient.setQueryData(["vista", "kpis"], parsed);
			} catch (e) {
				console.error("Failed to parse SSE data", e);
			}
		};

		es.onerror = () => {
			setIsConnected(false);
			toast.error("SSE disconnected. Retrying...");
		};
	}, [url, queryClient]);

	useEffect(() => {
		connect();
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		};
	}, [connect]);

	return { isConnected };
};
