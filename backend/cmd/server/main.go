package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	_ "modernc.org/sqlite"

	"zha-jinhua/internal/handler"
	"zha-jinhua/internal/room"
	"zha-jinhua/internal/ws"
)

func main() {
	// Database setup
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "zha-jinhua.db"
	}

	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// Initialize room manager
	roomManager := room.InitManager(db)

	// Initialize WebSocket hub
	wsHub := ws.NewHub()

	// Initialize handlers
	authHandler := &handler.AuthHandler{DB: db}
	roomHandler := &handler.RoomHandler{Manager: roomManager}
	wsHandler := handler.NewWSHandler(roomManager, wsHub)

	// Setup HTTP routes
	mux := http.NewServeMux()

	// Auth routes (no middleware)
	mux.HandleFunc("POST /api/register", authHandler.Register)
	mux.HandleFunc("POST /api/login", authHandler.Login)

	// Authenticated routes
	mux.Handle("GET /api/me", handler.AuthMiddleware(http.HandlerFunc(authHandler.Me)))
	mux.Handle("POST /api/rooms", handler.AuthMiddleware(http.HandlerFunc(roomHandler.CreateRoom)))
	mux.Handle("GET /api/rooms", handler.AuthMiddleware(http.HandlerFunc(roomHandler.ListRooms)))
	mux.Handle("GET /api/rooms/{id}", handler.AuthMiddleware(http.HandlerFunc(roomHandler.GetRoom)))

	// WebSocket
	mux.HandleFunc("GET /ws", wsHandler.ServeWS)

	// CORS middleware
	handler := corsMiddleware(mux)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func runMigrations(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		nickname TEXT NOT NULL DEFAULT '',
		chips INTEGER NOT NULL DEFAULT 10000,
		total_games INTEGER NOT NULL DEFAULT 0,
		total_wins INTEGER NOT NULL DEFAULT 0,
		total_earnings INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS rooms (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		max_players INTEGER NOT NULL DEFAULT 6,
		min_players INTEGER NOT NULL DEFAULT 2,
		ante INTEGER NOT NULL DEFAULT 20,
		allow_bot BOOLEAN NOT NULL DEFAULT 1,
		status TEXT NOT NULL DEFAULT 'waiting',
		created_by INTEGER NOT NULL REFERENCES users(id),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS game_records (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		room_id TEXT NOT NULL REFERENCES rooms(id),
		player_ids TEXT NOT NULL,
		winner_id INTEGER NOT NULL,
		hand_type TEXT,
		pot INTEGER NOT NULL,
		round_count INTEGER NOT NULL,
		finished_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := db.Exec(schema)
	return err
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
