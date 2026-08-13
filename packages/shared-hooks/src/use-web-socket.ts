import { useCallback, useEffect, useRef, useState } from "react";

export interface WebSocketOptions {
	onOpen?: (event: Event) => void;
	onMessage?: (event: MessageEvent) => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
}

export const useWebSocket = <T = unknown>(
	url: string | null,
	options: WebSocketOptions = {},
) => {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<T | null>(null);
	const reconnectAttempts = useRef(0);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

	const {
		onOpen,
		onMessage,
		onClose,
		onError,
		reconnectInterval = 3000,
		maxReconnectAttempts = 5,
	} = options;

	const connect = useCallback(() => {
		if (!url) return;
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = (event) => {
			setIsConnected(true);
			reconnectAttempts.current = 0;
			onOpen?.(event);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as T;
				setLastMessage(data);
				onMessage?.(event);
			} catch {
				// If not JSON, pass as is
				setLastMessage(event.data as T);
				onMessage?.(event);
			}
		};

		ws.onclose = (event) => {
			setIsConnected(false);
			onClose?.(event);
			// Attempt reconnect if not closed intentionally
			if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
				reconnectAttempts.current += 1;
				reconnectTimer.current = setTimeout(() => {
					connect();
				}, reconnectInterval);
			}
		};

		ws.onerror = (event) => {
			onError?.(event);
		};
	}, [
		url,
		onOpen,
		onMessage,
		onClose,
		onError,
		reconnectInterval,
		maxReconnectAttempts,
	]);

	const sendMessage = useCallback((data: unknown) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(data));
		} else {
			console.warn("WebSocket is not open. Message not sent.");
		}
	}, []);

	const disconnect = useCallback(() => {
		if (reconnectTimer.current) {
			clearTimeout(reconnectTimer.current);
			reconnectTimer.current = null;
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setIsConnected(false);
	}, []);

	useEffect(() => {
		connect();
		return () => {
			disconnect();
		};
	}, [connect, disconnect]);

	return { isConnected, lastMessage, sendMessage, disconnect };
};
