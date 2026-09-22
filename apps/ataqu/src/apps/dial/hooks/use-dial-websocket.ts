import type { Message } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { normalizeMessageList } from "../api/envelope";
import { useDialStore } from "../stores/dial-store";

type DialWsEvent =
	| { type: "subscribed"; channel_id: string }
	| { type: "unsubscribed"; channel_id: string }
	| {
			type: "message";
			id: string;
			channel_id: string;
			author_id: string;
			content: string;
			created_at: string;
			thread_id?: string | null;
	  }
	| {
			type: "message_edited";
			id: string;
			channel_id: string;
			content: string;
			edited_at?: string | null;
	  }
	| { type: "message_deleted"; message_id: string; channel_id: string }
	| { type: "typing"; channel_id: string; user_id: string }
	| { type: "channel_archived"; channel_id: string }
	| { type: "channel_updated"; channel_id: string; name?: string }
	| { type: "presence"; user_id: string; status: "online" | "away" | "offline" }
	| { type: "error"; message: string };

const messagesQueryKey = (channelId: string) => ["dial", "messages", channelId];

export function useDialWebSocket() {
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttempts = useRef(0);
	const { token } = useAuthStore();
	const setConnectionState = useDialStore((s) => s.setConnectionState);
	const setPresence = useDialStore((s) => s.setPresence);
	const removePresence = useDialStore((s) => s.removePresence);
	const queryClient = useQueryClient();

	const handleMessage = (raw: string) => {
		let data: DialWsEvent;
		try {
			data = JSON.parse(raw) as DialWsEvent;
		} catch {
			return;
		}
		const pageKey =
			"channel_id" in data ? messagesQueryKey(data.channel_id) : null;
		switch (data.type) {
			case "message": {
				if (!pageKey) return;
				queryClient.setQueriesData({ queryKey: pageKey }, (old: unknown) => {
					const page = normalizeMessageList<Message>(old);
					if (page.items.some((m) => m.id === data.id)) return old;
					const message: Partial<Message> = {
						id: data.id,
						channel_id: data.channel_id,
						author_id: data.author_id,
						content: data.content,
						sent_at: data.created_at,
						thread_id: data.thread_id ?? undefined,
					};
					return {
						...page,
						items: [...page.items, message],
						total: page.total + 1,
					};
				});
				break;
			}
			case "message_edited": {
				if (!pageKey) return;
				queryClient.setQueriesData({ queryKey: pageKey }, (old: unknown) => {
					const page = normalizeMessageList<Message>(old);
					return {
						...page,
						items: page.items.map((m) =>
							m.id === data.id
								? {
										...m,
										content: data.content,
										edited_at: data.edited_at ?? new Date().toISOString(),
									}
								: m,
						),
					};
				});
				break;
			}
			case "message_deleted": {
				if (!pageKey) return;
				queryClient.setQueriesData({ queryKey: pageKey }, (old: unknown) => {
					const page = normalizeMessageList<Message>(old);
					return {
						...page,
						items: page.items.filter((m) => m.id !== data.message_id),
						total: Math.max(0, page.total - 1),
					};
				});
				break;
			}
			case "typing":
				window.dispatchEvent(
					new CustomEvent("dial:typing", {
						detail: { channel_id: data.channel_id, user_id: data.user_id },
					}),
				);
				break;
			case "presence":
				if (data.status === "offline") removePresence(data.user_id);
				else setPresence(data.user_id, data.status);
				break;
			case "channel_archived":
			case "channel_updated":
				void queryClient.invalidateQueries({ queryKey: ["dial", "channels"] });
				break;
			default:
				break;
		}
	};

	const send = (payload: Record<string, unknown>) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(payload));
		}
	};

	const subscribe = (channelId: string) =>
		send({ action: "subscribe", channel_id: channelId });
	const unsubscribe = (channelId: string) =>
		send({ action: "unsubscribe", channel_id: channelId });

	const connect = () => {
		if (!token || wsRef.current) return;
		const base =
			((import.meta as any).env.VITE_WS_BASE_URL as string | undefined) ??
			"/api";
		const proto = window.location.protocol === "https:" ? "wss" : "ws";
		const ws = new WebSocket(
			`${proto}://${window.location.host}${base}/dial/ws?token=${token}`,
		);
		wsRef.current = ws;
		ws.onopen = () => {
			setConnectionState("connected");
			reconnectAttempts.current = 0;
			if (reconnectTimer.current) {
				clearTimeout(reconnectTimer.current);
				reconnectTimer.current = null;
			}
		};
		ws.onmessage = (event) => handleMessage(String(event.data));
		ws.onclose = (event) => {
			setConnectionState("disconnected");
			wsRef.current = null;
			if (!event.wasClean && reconnectAttempts.current < 5) {
				const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
				reconnectAttempts.current += 1;
				reconnectTimer.current = setTimeout(connect, delay);
			}
		};
		ws.onerror = () => ws.close();
	};

	const disconnect = () => {
		if (reconnectTimer.current) {
			clearTimeout(reconnectTimer.current);
			reconnectTimer.current = null;
		}
		wsRef.current?.close();
		wsRef.current = null;
		setConnectionState("disconnected");
	};

	return { connect, disconnect, subscribe, unsubscribe, send, handleMessage };
}
