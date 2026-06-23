package room

import (
	"database/sql"
	"sync"
)

// Manager is the global room manager (singleton).
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
	DB    *sql.DB
}

var globalManager *Manager

// InitManager initializes the global room manager.
func InitManager(db *sql.DB) *Manager {
	globalManager = &Manager{
		rooms: make(map[string]*Room),
		DB:    db,
	}
	return globalManager
}

// GetManager returns the global room manager.
func GetManager() *Manager {
	return globalManager
}

func (m *Manager) CreateRoom(name string, maxPlayers, minPlayers, ante int, allowBot bool, password string, createdBy int) (*Room, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Try to generate unique room code (max 5 attempts)
	var code string
	for i := 0; i < 5; i++ {
		code = GenerateRoomCode()
		if _, exists := m.rooms[code]; !exists {
			break
		}
	}

	room := NewRoom(name, code, maxPlayers, minPlayers, ante, allowBot, password, createdBy, m.DB)
	m.rooms[code] = room
	return room, nil
}

func (m *Manager) GetRoom(id string) *Room {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.rooms[id]
}

func (m *Manager) ListRooms() []*Room {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Room, 0, len(m.rooms))
	for _, r := range m.rooms {
		if r.Status == "waiting" {
			result = append(result, r)
		}
	}
	return result
}

func (m *Manager) DeleteRoom(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rooms[id]; ok {
		r.mu.Lock()
		r.Status = "finished"
		r.mu.Unlock()
		delete(m.rooms, id)
	}
}
