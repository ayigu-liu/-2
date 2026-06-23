package room

import (
	"database/sql"
	"errors"
	"sync"
	"time"

	"zha-jinhua/internal/game"
	"zha-jinhua/internal/ws"
)

var (
	errRoomFull          = errors.New("房间已满")
	errRoomAlreadyStarted = errors.New("游戏已开始")
)

type RoomStatus string

const (
	StatusWaiting  RoomStatus = "waiting"
	StatusReady    RoomStatus = "ready"
	StatusPlaying  RoomStatus = "playing"
	StatusFinished RoomStatus = "finished"
)

type GamePhase string

const (
	PhaseDealing  GamePhase = "dealing"
	PhaseBetting  GamePhase = "betting"
	PhaseShowdown GamePhase = "showdown"
	PhaseSettle   GamePhase = "settle"
)

type RoomSettings struct {
	MaxPlayers int
	MinPlayers int
	Ante       int
	AllowBot   bool
}

type Player struct {
	UserID   int
	Username string
	Nickname string
	Chips    int
	Ready    bool
	IsBot    bool
	Conn     Connection // nil for bots
}

// Connection abstracts a WebSocket connection for sending messages.
type Connection interface {
	SendJSON(v interface{}) error
	Close() error
}

type GameSession struct {
	Deck          []game.Card
	Hands         map[int][3]game.Card
	Seen          map[int]bool
	Pot           int
	CurrentBet    int
	TurnIndex     int
	TurnStart     time.Time
	Phase         GamePhase
	ActivePlayers []int // user IDs of players still in the current hand
	Eliminated    []int // user IDs eliminated this hand
	RoundCount    int
	LastRaiser    int // user ID who last raised; -1 if none
	ActionsSinceLastRaise int // consecutive calls since last raise
}

type Room struct {
	ID        string
	Name      string
	Settings  RoomSettings
	Status    RoomStatus
	Players   []*Player
	Game      *GameSession
	CreatedBy int
	DB        *sql.DB
	mu        sync.Mutex
	sendCh    chan func() // channel for serialized message sending
	stopCh    chan struct{}
	timerDone chan struct{}
}

func NewRoom(name, id string, maxPlayers, minPlayers, ante int, allowBot bool, createdBy int, db *sql.DB) *Room {
	r := &Room{
		ID:   id,
		Name: name,
		Settings: RoomSettings{
			MaxPlayers: maxPlayers,
			MinPlayers: minPlayers,
			Ante:       ante,
			AllowBot:   allowBot,
		},
		Status:    StatusWaiting,
		Players:   make([]*Player, 0, maxPlayers),
		CreatedBy: createdBy,
		DB:        db,
		sendCh:    make(chan func(), 100),
		stopCh:    make(chan struct{}),
		timerDone: make(chan struct{}),
	}
	go r.sendLoop()
	return r
}

func (r *Room) sendLoop() {
	for {
		select {
		case fn := <-r.sendCh:
			fn()
		case <-r.stopCh:
			return
		}
	}
}

// Broadcast sends a message to all connected players.
func (r *Room) Broadcast(v interface{}) {
	r.sendCh <- func() {
		for _, p := range r.Players {
			if p.Conn != nil {
				p.Conn.SendJSON(v)
			}
		}
	}
}

// SendTo sends a message to a specific player.
func (r *Room) SendTo(userID int, v interface{}) {
	r.sendCh <- func() {
		for _, p := range r.Players {
			if p.UserID == userID && p.Conn != nil {
				p.Conn.SendJSON(v)
			}
		}
	}
}

// AddPlayer adds a player to the room.
func (r *Room) AddPlayer(userID int, username, nickname string, chips int, conn Connection) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) >= r.Settings.MaxPlayers {
		return errRoomFull
	}
	if r.Status != StatusWaiting {
		return errRoomAlreadyStarted
	}
	for _, p := range r.Players {
		if p.UserID == userID {
			// Reconnect: update connection
			p.Conn = conn
			return nil
		}
	}

	r.Players = append(r.Players, &Player{
		UserID:   userID,
		Username: username,
		Nickname: nickname,
		Chips:    chips,
		Ready:    false,
		IsBot:    false,
		Conn:     conn,
	})
	return nil
}

// RemovePlayer removes and disconnects a player.
func (r *Room) RemovePlayer(userID int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i, p := range r.Players {
		if p.UserID == userID {
			if p.Conn != nil {
				p.Conn.Close()
			}
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			break
		}
	}
}

// PlayerCount returns the number of non-bot players.
func (r *Room) PlayerCount() int {
	count := 0
	for _, p := range r.Players {
		if !p.IsBot {
			count++
		}
	}
	return count
}

// TotalPlayerCount returns the total number of players (including bots).
func (r *Room) TotalPlayerCount() int {
	return len(r.Players)
}

// FindPlayerIndex returns the index of a player by user ID in the Players slice.
func (r *Room) FindPlayerIndex(userID int) int {
	for i, p := range r.Players {
		if p.UserID == userID {
			return i
		}
	}
	return -1
}

func (r *Room) FindActivePlayerIndex(userID int) int {
	if r.Game == nil {
		return -1
	}
	for i, uid := range r.Game.ActivePlayers {
		if uid == userID {
			return i
		}
	}
	return -1
}

// PlayerInfoList returns a list of PlayerInfo for broadcasting room state.
func (r *Room) PlayerInfoList() []ws.PlayerInfo {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.playerInfoListLocked()
}

// playerInfoListLocked returns PlayerInfo list; caller MUST hold r.mu.Lock().
func (r *Room) playerInfoListLocked() []ws.PlayerInfo {
	info := make([]ws.PlayerInfo, 0, len(r.Players))
	for _, p := range r.Players {
		handCount := 0
		isActive := true
		if r.Game != nil {
			if _, ok := r.Game.Hands[p.UserID]; ok {
				handCount = 3
			}
			isActive = r.FindActivePlayerIndex(p.UserID) >= 0
		}

		info = append(info, ws.PlayerInfo{
			UserID:    p.UserID,
			Username:  p.Username,
			Nickname:  p.Nickname,
			Chips:     p.Chips,
			Ready:     p.Ready,
			IsBot:     p.IsBot,
			Connected: p.Conn != nil || p.IsBot,
			HandCount: handCount,
			IsActive:  isActive,
		})
	}
	return info
}

// HandleNotReady sets a player's ready status to false.
func (r *Room) HandleNotReady(userID int) {
	r.mu.Lock()
	for _, p := range r.Players {
		if p.UserID == userID {
			p.Ready = false
			break
		}
	}
	r.mu.Unlock()

	r.Broadcast(ws.S2CRoomState{Type: ws.S2CTypeRoomState, RoomID: r.ID, Name: r.Name, Status: string(r.Status), Settings: ws.RoomSettingsMsg{
			MaxPlayers: r.Settings.MaxPlayers,
			MinPlayers: r.Settings.MinPlayers,
			Ante:       r.Settings.Ante,
			AllowBot:   r.Settings.AllowBot,
		}, Players: r.PlayerInfoList()})
}

// HandleLookCards marks that the player has looked at their cards.
func (r *Room) HandleLookCards(userID int) {
	r.mu.Lock()
	if r.Game != nil {
		r.Game.Seen[userID] = true
	}
	r.mu.Unlock()

	r.Broadcast(ws.S2CPlayerLooked{Type: ws.S2CTypePlayerLooked, PlayerID: userID})

	// Re-send cards now that they can see them
	if r.Game != nil {
		hand, ok := r.Game.Hands[userID]
		if ok {
			goCards := make([]ws.Card, 3)
			for i, c := range hand {
				goCards[i] = ws.Card{Suit: c.Suit, Rank: c.Rank}
			}
			r.SendTo(userID, ws.S2CYourCards{Type: ws.S2CTypeYourCards, Cards: goCards})
		}
	}
}
