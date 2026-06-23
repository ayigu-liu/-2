import { useReducer, useCallback } from "react";
import type {
  Card,
  PlayerInfo,
  ClientPlayerInfo,
  GamePhase,
  S2CRoundSettle,
  S2CGameOver,
} from "../types";
import type { S2CChatMessage } from "../types";

export interface ActionLog {
  player_id: number;
  action: string;
  amount?: number;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase | null;
  roomId: string | null;
  roomName: string | null;
  players: ClientPlayerInfo[];
  myUserId: number;
  myCards: Card[];
  seen: boolean;
  pot: number;
  currentBet: number;
  currentTurn: number | null;
  turnDeadline: number | null;
  activePlayerIds: number[];
  lastAction: { player_id: number; action: string; amount?: number } | null;
  compareResult: {
    challenger_id: number;
    target_id: number;
    winner_id: number;
    loser_cards: Card[];
    loser_hand_type?: string;
  } | null;
  showdownPlayers: {
    id: number;
    cards: Card[];
    hand_type: string;
  }[];
  roundResult: S2CRoundSettle | null;
  mySeatIndex: number;
  gameOver: S2CGameOver | null;
  actionHistory: ActionLog[];
  playerBets: Record<number, number>;
  chatMessages: S2CChatMessage[];
}

export type GameAction =
  | { type: "RESET" }
  | { type: "SET_USER_ID"; userId: number }
  | { type: "ROOM_STATE"; roomId: string; name: string; players: PlayerInfo[] }
  | { type: "GAME_START"; currentTurn: number; pot: number; timeout: number }
  | { type: "YOUR_CARDS"; cards: Card[] }
  | { type: "TURN_CHANGE"; playerId: number; deadline: number }
  | { type: "PLAYER_ACTION"; playerId: number; action: string; amount?: number; pot?: number; currentBet?: number }
  | { type: "PLAYER_LOOKED"; playerId: number }
  | { type: "COMPARE_RESULT"; challengerId: number; targetId: number; winnerId: number; loserCards: Card[]; loserHandType?: string }
  | { type: "PLAYER_ELIMINATED"; playerId: number }
  | { type: "SHOWDOWN"; players: { id: number; cards: Card[]; hand_type: string }[] }
  | { type: "ROUND_SETTLE"; data: S2CRoundSettle }
  | { type: "GAME_OVER"; data: S2CGameOver }
  | { type: "SET_SEEN" }
  | { type: "CHAT_MESSAGE"; message: S2CChatMessage }

/** Pure function: reindex players so seat 0 = me, rest in original order. */
export function reindexPlayers(players: PlayerInfo[], myUserId: number): ClientPlayerInfo[] {
  const withFallback: ClientPlayerInfo[] = players.map((p, i) => ({
    ...p,
    seat_index: p.seat_index ?? i,
  }));

  const myIdx = withFallback.findIndex((p) => p.user_id === myUserId);
  if (myIdx < 0) return withFallback;

  // Move me to front, assign seat 0; rest keep relative order
  const copy = [...withFallback];
  const [me] = copy.splice(myIdx, 1);
  const reindexed: ClientPlayerInfo[] = [
    { ...me, seat_index: 0 },
    ...copy.map((p, i) => ({ ...p, seat_index: i + 1 })),
  ];
  return reindexed.map((p, i) => ({ ...p, seat_index: i }));
}

export function createInitialState(userId: number): GameState {
  return {
    phase: null,
    roomId: null,
    roomName: null,
    players: [],
    myUserId: userId,
    myCards: [],
    seen: false,
    pot: 0,
    currentBet: 0,
    currentTurn: null,
    turnDeadline: null,
    activePlayerIds: [],
    lastAction: null,
    compareResult: null,
    showdownPlayers: [],
    roundResult: null,
    gameOver: null,
    actionHistory: [],
    playerBets: {},
    chatMessages: [],
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RESET":
      return { ...createInitialState(state.myUserId) };

    case "SET_USER_ID":
      return { ...state, myUserId: action.userId };

    case "ROOM_STATE": {
      const reindexed = reindexPlayers(action.players, state.myUserId);
      return {
        ...state,
        roomId: action.roomId,
        roomName: action.name,
        players: reindexed,
        mySeatIndex: 0,
      };
    }

    case "GAME_START":
      return {
        ...state,
        phase: "betting",
        pot: action.pot,
        currentTurn: action.currentTurn,
        turnDeadline: Date.now() + action.timeout * 1000,
        lastAction: null,
        compareResult: null,
        showdownPlayers: [],
        roundResult: null,
        actionHistory: [],
        gameOver: null,
        playerBets: {},
        chatMessages: [],
      };

    case "YOUR_CARDS":
      return {
        ...state,
        myCards: action.cards,
        players: state.players.map((p) =>
          p.user_id === state.myUserId ? { ...p, hand_count: action.cards.length } : p
        ),
      };

    case "TURN_CHANGE":
      return {
        ...state,
        currentTurn: action.playerId,
        turnDeadline: action.deadline,
      };

    case "PLAYER_ACTION": {
      const entry: ActionLog = {
        player_id: action.playerId,
        action: action.action,
        amount: action.amount,
        timestamp: Date.now(),
      };
      return {
        ...state,
        pot: action.pot ?? state.pot,
        currentBet: action.currentBet ?? state.currentBet,
        playerBets: {
          ...state.playerBets,
          [action.playerId]: action.amount ?? 0,
        },
        lastAction: {
          player_id: action.playerId,
          action: action.action,
          amount: action.amount,
        },
        actionHistory: [...state.actionHistory, entry],
      };
    }

    case "PLAYER_LOOKED":
      return state;

    case "COMPARE_RESULT":
      return {
        ...state,
        compareResult: {
          challenger_id: action.challengerId,
          target_id: action.targetId,
          winner_id: action.winnerId,
          loser_cards: action.loserCards,
          loser_hand_type: action.loserHandType,
        },
      };

    case "PLAYER_ELIMINATED":
      return {
        ...state,
        players: state.players.map((p) =>
          p.user_id === action.playerId ? { ...p, is_active: false } : p
        ),
      };

    case "SHOWDOWN":
      return {
        ...state,
        phase: "showdown",
        showdownPlayers: action.players,
        currentTurn: null,
      };

    case "ROUND_SETTLE":
      return {
        ...state,
        phase: "settle",
        roundResult: action.data,
        players: state.players.map((p) => ({
          ...p,
          chips: p.chips + (action.data.chip_deltas[p.user_id] || 0),
        })),
      };

    case "GAME_OVER":
      return {
        ...state,
        gameOver: action.data,
        currentTurn: null,
      };

    case "SET_SEEN":
      return { ...state, seen: true };

    case "CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [
          ...state.chatMessages,
          { type: "chat_message", user_id: action.message.user_id, username: action.message.username, content: action.message.content },
        ],
      };

    default:
      return state;
  }
}

/** Standalone hook — manages game state via reducer. */
export function useGameState(userId: number) {
  const [state, dispatch] = useReducer(gameReducer, userId, createInitialState);

  const handleMessage = useCallback((msg: import("../types").WSMessage) => {
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
        dispatch({ type: "PLAYER_ACTION", playerId: msg.player_id, action: msg.action, amount: msg.amount, pot: msg.pot });
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
  }, []);

  const resetGame = useCallback(() => dispatch({ type: "RESET" }), []);

  return { state, handleMessage, resetGame, dispatch };
}
