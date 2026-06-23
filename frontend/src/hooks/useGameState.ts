import { useReducer, useCallback } from "react";
import type {
  WSMessage,
  Card,
  PlayerInfo,
  GamePhase,
  S2CRoundSettle,
  S2CGameOver,
} from "../types";

interface GameState {
  phase: GamePhase | null;
  roomId: string | null;
  roomName: string | null;
  players: PlayerInfo[];
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
  gameOver: S2CGameOver | null;
}

type Action =
  | { type: "RESET" }
  | { type: "SET_USER_ID"; userId: number }
  | { type: "ROOM_STATE"; roomId: string; name: string; players: PlayerInfo[] }
  | { type: "GAME_START"; currentTurn: number; pot: number; timeout: number }
  | { type: "YOUR_CARDS"; cards: Card[] }
  | { type: "TURN_CHANGE"; playerId: number; deadline: number }
  | {
      type: "PLAYER_ACTION";
      playerId: number;
      action: string;
      amount?: number;
      pot?: number;
    }
  | { type: "PLAYER_LOOKED"; playerId: number }
  | {
      type: "COMPARE_RESULT";
      challengerId: number;
      targetId: number;
      winnerId: number;
      loserCards: Card[];
      loserHandType?: string;
    }
  | { type: "PLAYER_ELIMINATED"; playerId: number }
  | { type: "SHOWDOWN"; players: { id: number; cards: Card[]; hand_type: string }[] }
  | { type: "ROUND_SETTLE"; data: S2CRoundSettle }
  | { type: "GAME_OVER"; data: S2CGameOver }
  | { type: "SET_SEEN" };

const initialState: GameState = {
  phase: null,
  roomId: null,
  roomName: null,
  players: [],
  myUserId: 0,
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
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, myUserId: state.myUserId };
    case "SET_USER_ID":
      return { ...state, myUserId: action.userId };
    case "ROOM_STATE":
      return {
        ...state,
        roomId: action.roomId,
        roomName: action.name,
        players: action.players,
      };
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
      };
    case "YOUR_CARDS":
      return { ...state, myCards: action.cards };
    case "TURN_CHANGE":
      return {
        ...state,
        currentTurn: action.playerId,
        turnDeadline: action.deadline,
      };
    case "PLAYER_ACTION": {
      const pot = action.pot ?? state.pot;
      return {
        ...state,
        pot,
        lastAction: {
          player_id: action.playerId,
          action: action.action,
          amount: action.amount,
        },
      };
    }
    case "PLAYER_LOOKED":
      return { ...state };
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
      };
    case "GAME_OVER":
      return {
        ...state,
        phase: null,
        gameOver: action.data,
        currentTurn: null,
      };
    case "SET_SEEN":
      return { ...state, seen: true };
    default:
      return state;
  }
}

export function useGameState(userId: number) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Initialize user ID
  if (state.myUserId === 0 && userId > 0) {
    dispatch({ type: "SET_USER_ID", userId });
  }

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "room_state":
          dispatch({
            type: "ROOM_STATE",
            roomId: msg.room_id,
            name: msg.name,
            players: msg.players,
          });
          break;
        case "game_start":
          dispatch({
            type: "GAME_START",
            currentTurn: msg.current_turn,
            pot: msg.pot,
            timeout: msg.turn_timeout,
          });
          break;
        case "your_cards":
          dispatch({ type: "YOUR_CARDS", cards: msg.cards });
          break;
        case "turn_change":
          dispatch({
            type: "TURN_CHANGE",
            playerId: msg.player_id,
            deadline: new Date(msg.action_deadline).getTime(),
          });
          break;
        case "player_action":
          dispatch({
            type: "PLAYER_ACTION",
            playerId: msg.player_id,
            action: msg.action,
            amount: msg.amount,
            pot: msg.pot,
          });
          break;
        case "player_looked":
          dispatch({
            type: "PLAYER_LOOKED",
            playerId: msg.player_id,
          });
          break;
        case "compare_result":
          dispatch({
            type: "COMPARE_RESULT",
            challengerId: msg.challenger_id,
            targetId: msg.target_id,
            winnerId: msg.winner_id,
            loserCards: msg.loser_cards,
            loserHandType: msg.loser_hand_type,
          });
          break;
        case "player_eliminated":
          dispatch({
            type: "PLAYER_ELIMINATED",
            playerId: msg.player_id,
          });
          break;
        case "showdown":
          dispatch({
            type: "SHOWDOWN",
            players: msg.players,
          });
          break;
        case "round_settle":
          dispatch({ type: "ROUND_SETTLE", data: msg });
          break;
        case "game_over":
          dispatch({ type: "GAME_OVER", data: msg });
          break;
      }
    },
    []
  );

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return { state, handleMessage, resetGame, dispatch };
}
