package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"zha-jinhua/internal/room"
)

type RoomHandler struct {
	Manager *room.Manager
}

type createRoomRequest struct {
	Name       string `json:"name"`
	MaxPlayers *int   `json:"max_players,omitempty"`
	MinPlayers *int   `json:"min_players,omitempty"`
	Ante       *int   `json:"ante,omitempty"`
	AllowBot   *bool  `json:"allow_bot,omitempty"`
	Password   string `json:"password,omitempty"`
}

type roomResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	MaxPlayers  int    `json:"max_players"`
	MinPlayers  int    `json:"min_players"`
	Ante        int    `json:"ante"`
	AllowBot    bool   `json:"allow_bot"`
	Status      string `json:"status"`
	PlayerCount int    `json:"player_count"`
	CreatedBy   int    `json:"created_by"`
	HasPassword bool   `json:"has_password"`
}

type roomDetailResponse struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	MaxPlayers  int           `json:"max_players"`
	MinPlayers  int           `json:"min_players"`
	Ante        int           `json:"ante"`
	AllowBot    bool          `json:"allow_bot"`
	Status      string        `json:"status"`
	Players     []playerBrief `json:"players"`
	CreatedBy   int           `json:"created_by"`
	HasPassword bool          `json:"has_password"`
}

type playerBrief struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Ready    bool   `json:"ready"`
	IsBot    bool   `json:"is_bot"`
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())

	var req createRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "room name is required"})
		return
	}

	maxPlayers := 6
	minPlayers := 2
	ante := 20
	allowBot := true

	if req.MaxPlayers != nil {
		maxPlayers = *req.MaxPlayers
	}
	if req.MinPlayers != nil {
		minPlayers = *req.MinPlayers
	}
	if req.Ante != nil {
		ante = *req.Ante
	}
	if req.AllowBot != nil {
		allowBot = *req.AllowBot
	}

	if maxPlayers < 2 || maxPlayers > 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "max_players must be 2-6"})
		return
	}
	if minPlayers < 2 || minPlayers > maxPlayers {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "min_players must be 2-max_players"})
		return
	}
	if ante < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ante must be at least 1"})
		return
	}

	r2, err := h.Manager.CreateRoom(req.Name, maxPlayers, minPlayers, ante, allowBot, req.Password, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create room"})
		return
	}

	writeJSON(w, http.StatusCreated, roomResponse{
		ID:          r2.ID,
		Name:        r2.Name,
		MaxPlayers:  r2.Settings.MaxPlayers,
		MinPlayers:  r2.Settings.MinPlayers,
		Ante:        r2.Settings.Ante,
		AllowBot:    r2.Settings.AllowBot,
		Status:      string(r2.Status),
		PlayerCount: r2.TotalPlayerCount(),
		CreatedBy:   r2.CreatedBy,
		HasPassword: r2.Settings.Password != "",
	})
}

func (h *RoomHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	nameFilter := strings.ToLower(r.URL.Query().Get("name"))

	rooms := h.Manager.ListRooms()
	result := make([]roomResponse, 0, len(rooms))

	for _, r2 := range rooms {
		if nameFilter != "" && !strings.Contains(strings.ToLower(r2.Name), nameFilter) {
			continue
		}
		result = append(result, roomResponse{
			ID:          r2.ID,
			Name:        r2.Name,
			MaxPlayers:  r2.Settings.MaxPlayers,
			MinPlayers:  r2.Settings.MinPlayers,
			Ante:        r2.Settings.Ante,
			AllowBot:    r2.Settings.AllowBot,
			Status:      string(r2.Status),
			PlayerCount: r2.TotalPlayerCount(),
			CreatedBy:   r2.CreatedBy,
			HasPassword: r2.Settings.Password != "",
		})
	}

	if result == nil {
		result = []roomResponse{}
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "room id is required"})
		return
	}

	r2 := h.Manager.GetRoom(id)
	if r2 == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "room not found"})
		return
	}

	players := make([]playerBrief, 0, len(r2.Players))
	for _, p := range r2.Players {
		players = append(players, playerBrief{
			UserID:   p.UserID,
			Username: p.Username,
			Nickname: p.Nickname,
			Ready:    p.Ready,
			IsBot:    p.IsBot,
		})
	}

	writeJSON(w, http.StatusOK, roomDetailResponse{
		ID:         r2.ID,
		Name:       r2.Name,
		MaxPlayers: r2.Settings.MaxPlayers,
		MinPlayers: r2.Settings.MinPlayers,
		Ante:       r2.Settings.Ante,
		AllowBot:   r2.Settings.AllowBot,
		Status:     string(r2.Status),
		Players:    players,
		CreatedBy:  r2.CreatedBy,
		HasPassword: r2.Settings.Password != "",
	})
}
