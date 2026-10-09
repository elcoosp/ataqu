/**
 * Vite dev plugin: a real WebSocket server implementing the DIAL protocol
 * (subscribe / typing / presence) so the chat's live layer works end-to-end
 * in mock mode. MSW cannot intercept WebSocket upgrades (it is a service
 * worker), so the dev server transparently proxies `ws://…/api/dial/ws` to
 * this in-process server instead of the (absent) Rust backend.
 *
 * Protocol frames (mirrors crates/ataqu-api/src/handlers/dial_ws.rs):
 *   client → {action:"subscribe"|"unsubscribe"|"typing", channel_id}
 *   server → {type:"subscribed"|"unsubscribed"|"typing"|"presence"|"message"|"error", …}
 */
import type { WebSocket } from "ws";
import type { Plugin } from "vite";

const WS_PORT = 5174;

interface MockWsWithMeta {
        userId: string;
        channels: Set<string>;
}

export function dialWsMockPlugin(): Plugin {
        return {
                name: "ataqu-dial-ws-mock",
                apply: "serve",
                configureServer(server) {
                        // Lazy-import `ws` so builds never touch it.
                        import("ws").then(({ WebSocketServer }) => {
                                const wss = new WebSocketServer({ host: "127.0.0.1", port: WS_PORT });
                                const sockets = new Map<WebSocket, MockWsWithMeta>();

                                const broadcast = (payload: unknown, except?: WebSocket) => {
                                        const frame = JSON.stringify(payload);
                                        for (const [ws] of sockets) {
                                                if (ws !== except && ws.readyState === 1) ws.send(frame);
                                        }
                                };

                                const onlineUsers = () =>
                                        [...sockets.values()].map((meta) => meta.userId);

                                wss.on("connection", (ws, req) => {
                                        const url = new URL(req.url ?? "/", "http://localhost");
                                        const token = url.searchParams.get("token") ?? "";
                                        const userId = token.split(".")[1] ?? "usr-unknown";
                                        const meta: MockWsWithMeta = { userId, channels: new Set() };
                                        sockets.set(ws, meta);

                                        ws.send(
                                                JSON.stringify({ type: "presence", user_id: userId, status: "online" }),
                                        );
                                        broadcast(
                                                { type: "presence", user_id: userId, status: "online" },
                                                ws,
                                        );

                                        ws.on("message", (raw) => {
                                                let frame: Record<string, unknown>;
                                                try {
                                                        frame = JSON.parse(String(raw)) as Record<string, unknown>;
                                                } catch {
                                                        return;
                                                }
                                                const channelId = String(frame.channel_id ?? "");
                                                switch (frame.action) {
                                                        case "subscribe":
                                                                meta.channels.add(channelId);
                                                                ws.send(JSON.stringify({ type: "subscribed", channel_id: channelId }));
                                                                break;
                                                        case "unsubscribe":
                                                                meta.channels.delete(channelId);
                                                                ws.send(JSON.stringify({ type: "unsubscribed", channel_id: channelId }));
                                                                break;
                                                        case "typing":
                                                                broadcast({ type: "typing", channel_id: channelId, user_id: userId }, ws);
                                                                break;
                                                        case "message":
                                                                // Demo relay: messages persist via REST + MSW; the WS layer
                                                                // echoes the broadcast so multi-tab demos feel live.
                                                                broadcast(
                                                                        {
                                                                                type: "message",
                                                                                id: `msg-ws-${Date.now()}`,
                                                                                channel_id: channelId,
                                                                                author_id: userId,
                                                                                content: String(frame.content ?? ""),
                                                                                created_at: new Date().toISOString(),
                                                                        },
                                                                        ws,
                                                                );
                                                                break;
                                                        default:
                                                                break;
                                                }
                                        });

                                        ws.on("close", () => {
                                                sockets.delete(ws);
                                                broadcast({ type: "presence", user_id: userId, status: "offline" });
                                        });

                                        ws.on("error", () => ws.close());
                                });

                                wss.on("error", (err) => {
                                        server.config.logger.warn(
                                                `[dial-ws-mock] WebSocket mock unavailable: ${err.message}`,
                                        );
                                });

                                server.httpServer?.on("close", () => {
                                        wss.close();
                                });
                        });
                },
        };
}
