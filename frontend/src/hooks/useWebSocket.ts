import { useEffect, useRef, useState, useCallback } from "react";
import { getWsUrl } from "../api/client";
import type { WSMessage } from "../types";

interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: WSMessage | null;
  roomState: Record<string, unknown>;
  send: (msg: unknown) => void;
  connect: (roomId?: string) => void;
  disconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [roomState, setRoomState] = useState<Record<string, unknown>>({});
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const shouldReconnectRef = useRef(false);

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((_roomId?: string) => {
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        setLastMessage(msg);

        if (msg.type === "room_state") {
          setRoomState(msg as unknown as Record<string, unknown>);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Reconnect logic
  useEffect(() => {
    if (!connected && shouldReconnectRef.current) {
      const timeout =
        Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 16000);
      const timer = setTimeout(() => {
        if (
          reconnectAttemptRef.current < maxReconnectAttempts &&
          shouldReconnectRef.current
        ) {
          reconnectAttemptRef.current++;
          connect();
        }
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [connected, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { connected, lastMessage, roomState, send, connect, disconnect };
}
