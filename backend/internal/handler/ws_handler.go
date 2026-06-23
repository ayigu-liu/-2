package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"zha-jinhua/internal/auth"
	"zha-jinhua/internal/model"
	"zha-jinhua/internal/room"
	"zha-jinhua/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSHandler struct {
	Manager *room.Manager
	Hub     *ws.Hub

	mu           sync.RWMutex
	userClients  map[int]*ws.Client   // userID -> client
	userModels   map[int]*model.User  // userID -> user
	userRooms    map[int]string       // userID -> roomID
}

func NewWSHandler(manager *room.Manager, hub *ws.Hub) *WSHandler {
	h := &WSHandler{
		Manager:    manager,
		Hub:        hub,
		userClients: make(map[int]*ws.Client),
		userModels:  make(map[int]*model.User),
		userRooms:   make(map[int]string),
	}

	// Set the global message router once at initialization
	ws.SetMessageRouter(func(msgType string) func(userID int, data json.RawMessage) {
		switch msgType {
		case "join_room":
			return func(userID int, data json.RawMessage) {
				var msg ws.C2SJoinRoom
				if err := json.Unmarshal(data, &msg); err != nil {
					h.sendError(userID, "bad_request", "invalid join_room data")
					return
				}
				h.handleJoinRoom(userID, msg.RoomID)
			}
		case "leave_room":
			return func(userID int, data json.RawMessage) {
				h.handleLeaveRoom(userID)
			}
		case "set_ready":
			return func(userID int, data json.RawMessage) {
				h.handleReady(userID)
			}
		case "set_not_ready":
			return func(userID int, data json.RawMessage) {
				h.handleNotReady(userID)
			}
		case "look_cards":
			return func(userID int, data json.RawMessage) {
				h.handleLookCards(userID)
			}
		case "bet":
			return func(userID int, data json.RawMessage) {
				var msg ws.C2SBot
				if err := json.Unmarshal(data, &msg); err != nil {
					h.sendError(userID, "bad_request", "invalid bet data")
					return
				}
				h.handleBet(userID, msg.Action, msg.Amount)
			}
		case "compare":
			return func(userID int, data json.RawMessage) {
				var msg ws.C2SCompare
				if err := json.Unmarshal(data, &msg); err != nil {
					h.sendError(userID, "bad_request", "invalid compare data")
					return
				}
				h.handleCompare(userID, msg.TargetPlayerID)
			}
		case "showdown":
			return func(userID int, data json.RawMessage) {
				h.handleShowdown(userID)
			}
		default:
			return nil
		}
	})

	return h
}

func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
		return
	}

	userID, err := auth.ValidateToken(token)
	if err != nil {
		http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := ws.NewClient(conn, userID, h.Hub)

	// Register client immediately to avoid race with readPump
	h.mu.Lock()
	h.userClients[userID] = client
	h.mu.Unlock()

	user, err := model.GetUserByID(h.Manager.DB, userID)
	if err != nil {
		client.SendJSON(map[string]interface{}{
			"type":  "room_error",
			"code":  "auth_failed",
			"error": "user not found",
		})
		h.mu.Lock()
		delete(h.userClients, userID)
		h.mu.Unlock()
		client.Close()
		return
	}

	h.mu.Lock()
	h.userModels[userID] = user
	h.mu.Unlock()

	// Cleanup happens when readPump exits and hub unregisters the client
}

// sendError sends an error message to a specific user.
func (h *WSHandler) sendError(userID int, code, message string) {
	h.mu.RLock()
	client := h.userClients[userID]
	h.mu.RUnlock()
	if client != nil {
		client.SendJSON(ws.S2CRoomError{Type: ws.S2CTypeRoomError, Code: code, Message: message})
	}
}

// getClient returns the WebSocket client for a user.
func (h *WSHandler) getClient(userID int) *ws.Client {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.userClients[userID]
}

func (h *WSHandler) handleJoinRoom(userID int, roomID string) {
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		h.sendError(userID, "room_not_found", "房间不存在")
		return
	}

	h.mu.RLock()
	user := h.userModels[userID]
	client := h.userClients[userID]
	h.mu.RUnlock()

	if user == nil || client == nil {
		h.sendError(userID, "auth_error", "用户未认证")
		return
	}

	err := r.AddPlayer(user.ID, user.Username, user.Nickname, user.Chips, client)
	if err != nil {
		h.sendError(userID, "join_failed", err.Error())
		return
	}

	h.mu.Lock()
	h.userRooms[userID] = roomID
	h.mu.Unlock()

	r.Broadcast(roomStateFromRoom(r))
}

func (h *WSHandler) handleLeaveRoom(userID int) {
	h.mu.Lock()
	roomID := h.userRooms[userID]
	delete(h.userRooms, userID)
	h.mu.Unlock()

	if roomID == "" {
		return
	}

	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}

	r.RemovePlayer(userID)
	if len(r.Players) > 0 {
		r.Broadcast(roomStateFromRoom(r))
	}
}

func (h *WSHandler) handleReady(userID int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	r.HandleReady(userID)
}

func (h *WSHandler) handleNotReady(userID int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	r.HandleNotReady(userID)
}

func (h *WSHandler) handleLookCards(userID int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	r.HandleLookCards(userID)
}

func (h *WSHandler) handleBet(userID int, action string, amount *int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	var amt int
	if amount != nil {
		amt = *amount
	}
	r.HandleBet(userID, action, amt)
}

func (h *WSHandler) handleCompare(userID, targetID int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	r.HandleCompare(userID, targetID)
}

func (h *WSHandler) handleShowdown(userID int) {
	roomID := h.getUserRoom(userID)
	if roomID == "" {
		return
	}
	r := h.Manager.GetRoom(roomID)
	if r == nil {
		return
	}
	r.HandleShowdown(userID)
}

func (h *WSHandler) getUserRoom(userID int) string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.userRooms[userID]
}

// roomStateFromRoom builds a room state broadcast message from a Room object.
func roomStateFromRoom(r *room.Room) ws.S2CRoomState {
	info := r.PlayerInfoList()
	return ws.S2CRoomState{Type: ws.S2CTypeRoomState, RoomID: r.ID, Name: r.Name, Status: string(r.Status), Settings: ws.RoomSettingsMsg{
			MaxPlayers: r.Settings.MaxPlayers,
			MinPlayers: r.Settings.MinPlayers,
			Ante:       r.Settings.Ante,
			AllowBot:   r.Settings.AllowBot,
		}, Players: info}
}
