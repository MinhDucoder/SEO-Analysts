import { io, type Socket } from "socket.io-client";
import { WS_URL } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Socket.IO singleton for the gateway WebSocket (`/ws` namespace). Connection
 * is lazy — `getSocket()` is a no-op if already connected and safe to call
 * from every hook.
 *
 * Reconnect policy (per docs/design/33-realtime-ux.md §3):
 *   Attempt 1 → 1s, …exponential with jitter… Attempt 10 → ~10s, then fail.
 *
 * Slug 1 (web-bootstrap) ships this as a stub singleton. Slug 5
 * (audits-detail-realtime) layers `useAuditRealtime` on top and wires the
 * global audit listener.
 */

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;

  if (!socket) {
    // Server uses `@WebSocketGateway({ namespace: '/ws' })` — `/ws` is a
    // Socket.IO **namespace**, not the engine.io `path`. Append it to the
    // host URL so the client opens the right namespace; leave `path` at the
    // default `/socket.io`.
    socket = io(`${WS_URL}/ws`, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.3,
      autoConnect: false,
    });
  } else if (token) {
    // Re-auth an existing disconnected socket with a fresh token.
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Test helper — resets the singleton between test cases.
 * Not exported through the public barrel.
 */
export function __resetSocketForTests(): void {
  socket = null;
}
