// Card types matching backend protocol
export type Suit = "spades" | "hearts" | "clubs" | "diamonds";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
}

// User / Auth
export interface User {
  id: number;
  username: string;
  nickname: string;
  chips: number;
  totalGames: number;
  totalWins: number;
  totalEarnings: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Room
export interface RoomSettings {
  max_players: number;
  min_players: number;
  ante: number;
  allow_bot: boolean;
}

export interface PlayerInfo {
  user_id: number;
  username: string;
  nickname: string;
  chips: number;
  ready: boolean;
  is_bot: boolean;
  connected: boolean;
  hand_count: number;
  is_active: boolean;
  /** Client-computed seat position. Not sent by server. */
  seat_index?: number;
}

/** PlayerInfo with guaranteed seat_index — used after client-side re-indexing. */
export interface ClientPlayerInfo extends PlayerInfo {
  seat_index: number;
}

export interface RoomBrief {
  id: string;
  name: string;
  max_players: number;
  min_players: number;
  ante: number;
  allow_bot: boolean;
  status: string;
  player_count: number;
  created_by: number;
}

export interface RoomDetail {
  id: string;
  name: string;
  max_players: number;
  min_players: number;
  ante: number;
  allow_bot: boolean;
  status: string;
  players: PlayerInfo[];
  created_by: number;
}

// Game state
export type GamePhase = "dealing" | "betting" | "showdown" | "settle";

export interface GameState {
  phase: GamePhase;
  pot: number;
  currentBet: number;
  currentTurn: number | null;
  turnDeadline: number | null;
  activePlayers: number[];
  lastAction: PlayerAction | null;
}

export interface PlayerAction {
  player_id: number;
  action: string;
  amount?: number;
}

export interface ShowdownPlayer {
  id: number;
  cards: Card[];
  hand_type: string;
  hand_rank: number;
}

// WebSocket messages (S2C)
export interface S2CRoomState {
  type: "room_state";
  room_id: string;
  name: string;
  status: string;
  players: PlayerInfo[];
  settings: RoomSettings;
}

export interface S2CGameStart {
  type: "game_start";
  current_turn: number;
  turn_timeout: number;
  pot: number;
}

export interface S2CYourCards {
  type: "your_cards";
  cards: Card[];
}

export interface S2CTurnChange {
  type: "turn_change";
  player_id: number;
  action_deadline: number;
}

export interface S2CPlayerAction {
  type: "player_action";
  player_id: number;
  action: string;
  amount?: number;
  pot?: number;
  current_bet?: number;
}

export interface S2CPlayerLooked {
  type: "player_looked";
  player_id: number;
}

export interface S2CCompareResult {
  type: "compare_result";
  challenger_id: number;
  target_id: number;
  winner_id: number;
  loser_hand_type?: string;
  loser_cards: Card[];
}

export interface S2CPlayerEliminated {
  type: "player_eliminated";
  player_id: number;
}

export interface S2CShowdown {
  type: "showdown";
  players: ShowdownPlayer[];
}

export interface S2CRoundSettle {
  type: "round_settle";
  winner_id: number;
  hand_type: string;
  pot: number;
  chip_deltas: Record<number, number>;
}

export interface S2CGameOver {
  type: "game_over";
  winner_id: number;
  total_pot: number;
  rounds: number;
  final_chips: Record<number, number>;
}

export interface S2CRoomError {
  type: "room_error";
  code: string;
  message: string;
}

export type WSMessage =
  | S2CRoomState
  | S2CGameStart
  | S2CYourCards
  | S2CTurnChange
  | S2CPlayerAction
  | S2CPlayerLooked
  | S2CCompareResult
  | S2CPlayerEliminated
  | S2CShowdown
  | S2CRoundSettle
  | S2CGameOver
  | S2CRoomError;
