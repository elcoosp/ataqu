import type { Message } from '@ataqu/api-client';
import { useAuthStore } from '@ataqu/shared-stores';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useDialStore } from '@/stores/dial-store';

type WebSocketMessage =
  | { type: 'message'; channelId: string; message: Message }
  | { type: 'presence'; userId: string; status: 'online' | 'away' | 'offline' }
  | { type: 'reaction'; channelId: string; messageId: string; reaction: unknown }
  | { type: 'thread'; channelId: string; thread: unknown };

export const useDialWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const { token } = useAuthStore();
  const { setConnectionState, setPresence, removePresence } = useDialStore();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!token) return;
    const wsUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5175';
    const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      reconnectAttempts.current = 0;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        switch (data.type) {
          case 'message': {
            // Update messages cache for the channel
            const queryKey = ['dial', 'messages', data.channelId, { limit: 100, offset: 0 }];
            queryClient.setQueryData(queryKey, (old: unknown) => {
              if (!old) return old;
              // Append new message to the list (or prepend depending on order)
              // Assuming messages are paginated, we could update the first page
              return {
                ...old,
                items: [data.message, ...((old as any).items || [])],
                total: ((old as any).total || 0) + 1,
              };
            });
            break;
          }
          case 'presence':
            if (data.status === 'offline') {
              removePresence(data.userId);
            } else {
              setPresence(data.userId, data.status);
            }
            break;
          case 'reaction': {
            // Update reactions cache
            const queryKey = ['dial', 'reactions', data.messageId];
            queryClient.setQueryData(queryKey, (old: unknown) => {
              if (!old) return [data.reaction];
              return [...(old as unknown[]), data.reaction];
            });
            break;
          }
          case 'thread': {
            // Update thread messages cache
            // We'll handle this in the thread component with a separate query
            break;
          }
        }
      } catch (e) {
        console.warn('Failed to parse WebSocket message', e);
      }
    };

    ws.onclose = (event) => {
      setConnectionState('disconnected');
      if (!event.wasClean) {
        // Attempt reconnect with exponential backoff
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current += 1;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.warn('WebSocket error', error);
    };
  }, [token, setConnectionState, setPresence, removePresence, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, [setConnectionState]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Return send function
  const send = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not open, message not sent');
    }
  }, []);

  return { send, isConnected: useDialStore((s) => s.connectionState === 'connected') };
};
