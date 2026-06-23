import { useEffect, useRef, useReducer, useCallback, useState, useMemo } from "react";
import { getWsUrl } from "../api/client";
import { gameReducer, createInitialState, reindexPlayers } from "./useGameState";
import type { WSMessage, PlayerInfo, ClientPlayerInfo } from "../types";
import type { GameState, GameAction } from "./useGameState";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface GameRoomState extends GameState {
  /** Additional player infos computed by client after reindex */
  seatedPlayers: ClientPlayerInfo[];
}

export interface GameRoomActions {
  ready: () => void;
  lookCards: () => void;
  bet: (action: string, amount?: number) => void;
  compare: (targetId: number) => void;
  showdown: () => void;
  leave: () => void;
  reconnect: () => void;
}

export interface GameRoomReturn {
  state: GameRoomState;
  connectionStatus: ConnectionStatus;
  error: string | null;
  actions: GameRoomActions;
  /** Full game dispatch for advanced use (e.g. SEEN) */
  dispatch: React.Dispatch<GameAction>;
}

/** Route WS message → reducer action. */
function routeMessage(msg: WSMessage, dispatch: React.Dispatch<GameAction>) {
  switch (msg.type) {
    case "room_state":
      dispatch({ type: "ROOM_STATE", roomId: msg.room_id, name: msg.name, players: msg.players });
      break;
    case "game_start":
      dispatch({ type: "GAME_START", currentTurn: msg.current_turn, pot: msg.pot, timeout: msg.turn_timeout });
      break;
    case "your_cards":
      dispatch({ type: "YOUR_CARDS", cards: msg.cards });
      break;
    case "turn_change":
      dispatch({ type: "TURN_CHANGE", playerId: msg.player_id, deadline: new Date(msg.action_deadline).getTime() });
      break;
    case "player_action":
      dispatch({ type: "PLAYER_ACTION", playerId: msg.player_id, action: msg.action, amount: msg.amount, pot: msg.pot, currentBet: msg.current_bet });
      break;
    case "player_looked":
      dispatch({ type: "PLAYER_LOOKED", playerId: msg.player_id });
      break;
    case "compare_result":
      dispatch({ type: "COMPARE_RESULT", challengerId: msg.challenger_id, targetId: msg.target_id, winnerId: msg.winner_id, loserCards: msg.loser_cards, loserHandType: msg.loser_hand_type });
      break;
    case "player_eliminated":
      dispatch({ type: "PLAYER_ELIMINATED", playerId: msg.player_id });
      break;
    case "showdown":
      dispatch({ type: "SHOWDOWN", players: msg.players });
      break;
    case "round_settle":
      dispatch({ type: "ROUND_SETTLE", data: msg });
      break;
    case "game_over":
      dispatch({ type: "GAME_OVER", data: msg });
      break;
  }
}

export function useGameRoom(roomId: string, userId: number): GameRoomReturn {
  const [state, dispatch] = useReducer(gameReducer, userId, createInitialState);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // Refs for stable callbacks
  const wsRef = useRef<WebSocket | null>(null);
  const joinedRef = useRef(false);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus("connecting");
    setError(null);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      // Room join happens in effect below
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        routeMessage(msg, dispatchRef.current);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      if (joinedRef.current) {
        setError("连接断开，正在重连...");
        // Auto-reconnect after delay
        setTimeout(() => connect(), 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  // Initial connect
  useEffect(() => {
    connect();
    return () => {
      joinedRef.current = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Join room when connected
  useEffect(() => {
    if (connectionStatus === "connected" && roomId && !joinedRef.current) {
      send({ type: "join_room", data: { room_id: roomId } });
      joinedRef.current = true;
    }
  }, [connectionStatus, roomId, send]);

  // Reset + reconnect on roomId change
  useEffect(() => {
    joinedRef.current = false;
    dispatch({ type: "RESET" });
    dispatch({ type: "SET_USER_ID", userId });
    connect();
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = useMemo<GameRoomActions>(() => ({
    ready: () => send({ type: "set_ready", data: {} }),
    lookCards: () => {
      dispatchRef.current({ type: "SET_SEEN" });
      send({ type: "look_cards", data: {} });
    },
    bet: (action, amount) => send({ type: "bet", data: { action, ...(amount !== undefined ? { amount } : {}) } }),
    compare: (targetId) => send({ type: "compare", data: { target_player_id: targetId } }),
    showdown: () => send({ type: "showdown", data: {} }),
    leave: () => send({ type: "leave_room", data: {} }),
    reconnect: () => {
      joinedRef.current = false;
      connect();
    },
  }), [send, connect]);

  const seatedPlayers = useMemo(
    () => reindexPlayers(state.players, state.myUserId),
    [state.players, state.myUserId]
  );

  return {
    state: { ...state, seatedPlayers },
    connectionStatus,
    error,
    actions,
    dispatch,
  };
}
