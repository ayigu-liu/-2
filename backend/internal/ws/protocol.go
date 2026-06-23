package ws
import "encoding/json"

// Card represents a playing card in the game.
type Card struct {
	Suit string `json:"suit"` // spades, hearts, clubs, diamonds
	Rank int    `json:"rank"` // 2-14 (11=J, 12=Q, 13=K, 14=A)
}

// --- Client-to-Server message types ---

type C2SJoinRoom struct {
	RoomID   string `json:"room_id"`
	Password string `json:"password,omitempty"`
}

type C2SLeaveRoom struct{}

type C2SSetReady struct{}

type C2SSetNotReady struct{}

type C2SToggleBot struct {
	Enabled bool `json:"enabled"`
}

type C2SLookCards struct{}

type C2SBot struct {
	Action string `json:"action"` // call, raise, fold, blind_bet
	Amount *int   `json:"amount,omitempty"`
}

type C2SCompare struct {
	TargetPlayerID int `json:"target_player_id"`
}

type C2SShowdown struct{}

// IncomingMessage wraps all client-to-server messages.
type IncomingMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}
// S2C message type constants
const (
	S2CTypeRoomState         = "room_state"
	S2CTypeRoomError         = "room_error"
	S2CTypeGameStart         = "game_start"
	S2CTypeYourCards         = "your_cards"
	S2CTypeTurnChange        = "turn_change"
	S2CTypePlayerAction      = "player_action"
	S2CTypePlayerLooked      = "player_looked"
	S2CTypeCompareResult     = "compare_result"
	S2CTypePlayerEliminated  = "player_eliminated"
	S2CTypeShowdown          = "showdown"
	S2CTypeRoundSettle       = "round_settle"
	S2CTypeChatMessage      = "chat_message"
	S2CTypeGameOver          = "game_over"
)
// --- Server-to-Client message types ---

type S2CChatMessage struct {
	Type     string `json:"type"`
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Content  string `json:"content"`
}

type S2CRoomState struct {
	Type     string          `json:"type"`
	RoomID   string          `json:"room_id"`
	Name     string          `json:"name"`
	Status   string          `json:"status"`
	Players  []PlayerInfo    `json:"players"`
	Settings RoomSettingsMsg `json:"settings"`
}

type PlayerInfo struct {
	UserID     int    `json:"user_id"`
	Username   string `json:"username"`
	Nickname   string `json:"nickname"`
	Chips      int    `json:"chips"`
	Ready      bool   `json:"ready"`
	IsBot      bool   `json:"is_bot"`
	Connected  bool   `json:"connected"`
	HandCount  int    `json:"hand_count"`  // 0 or 3, for display
	IsActive   bool   `json:"is_active"`   // still in the current hand
}

type RoomSettingsMsg struct {
	MaxPlayers  int  `json:"max_players"`
	MinPlayers  int  `json:"min_players"`
	Ante        int  `json:"ante"`
	AllowBot    bool `json:"allow_bot"`
	HasPassword bool `json:"has_password"`
}

type S2CRoomError struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type S2CGameStart struct {
	Type         string `json:"type"`
	CurrentTurn  int    `json:"current_turn"`
	TurnTimeout  int    `json:"turn_timeout"`
	Pot          int    `json:"pot"`
}

type S2CYourCards struct {
	Type  string `json:"type"`
	Cards []Card `json:"cards"`
}

type S2CTurnChange struct {
	Type           string `json:"type"`
	PlayerID       int    `json:"player_id"`
	ActionDeadline int64  `json:"action_deadline"`
}

type S2CPlayerAction struct {
	Type       string `json:"type"`
	PlayerID   int    `json:"player_id"`
	Action     string `json:"action"`
	Amount     *int   `json:"amount,omitempty"`
	Pot        int    `json:"pot"`
	CurrentBet int    `json:"current_bet"`
}

type S2CPlayerLooked struct {
	Type     string `json:"type"`
	PlayerID int    `json:"player_id"`
}

type S2CCompareResult struct {
	Type          string `json:"type"`
	ChallengerID  int    `json:"challenger_id"`
	TargetID      int    `json:"target_id"`
	WinnerID      int    `json:"winner_id"`
	LoserHandType string `json:"loser_hand_type,omitempty"`
	LoserCards    []Card `json:"loser_cards"`
}

type S2CPlayerEliminated struct {
	Type     string `json:"type"`
	PlayerID int    `json:"player_id"`
}

type S2CShowdown struct {
	Type    string           `json:"type"`
	Players []ShowdownPlayer `json:"players"`
}

type ShowdownPlayer struct {
	ID        int    `json:"id"`
	Cards     []Card `json:"cards"`
	HandType  string `json:"hand_type"`
	HandRank  int    `json:"hand_rank"`
}

type S2CRoundSettle struct {
	Type       string         `json:"type"`
	WinnerID   int            `json:"winner_id"`
	HandType   string         `json:"hand_type"`
	Pot        int            `json:"pot"`
	ChipDeltas map[int]int    `json:"chip_deltas"`
}

type S2CGameOver struct {
	Type       string         `json:"type"`
	WinnerID   int            `json:"winner_id"`
	TotalPot   int            `json:"total_pot"`
	Rounds     int            `json:"rounds"`
	FinalChips map[int]int    `json:"final_chips"`
}
