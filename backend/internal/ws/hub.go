package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 30 * time.Second
	pingPeriod     = 15 * time.Second
	maxMessageSize = 4096
)

// Client represents a single WebSocket connection.
type Client struct {
	Conn   *websocket.Conn
	UserID int
	Send   chan []byte
	Hub    *Hub
	mu     sync.Mutex
	closed bool
}

// Hub maintains the set of active clients.
type Hub struct {
	mu      sync.RWMutex
	clients map[int]*Client // userID -> client
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[int]*Client),
	}
}

func (h *Hub) Register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.UserID] = client
}

func (h *Hub) Unregister(userID int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if client, ok := h.clients[userID]; ok {
		client.mu.Lock()
		client.closed = true
		client.mu.Unlock()
		close(client.Send)
		delete(h.clients, userID)
	}
}

func (h *Hub) GetClient(userID int) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.clients[userID]
}

// NewClient creates a new client and starts its read/write goroutines.
func NewClient(conn *websocket.Conn, userID int, hub *Hub) *Client {
	client := &Client{
		Conn:   conn,
		UserID: userID,
		Send:   make(chan []byte, 256),
		Hub:    hub,
	}

	hub.Register(client)

	// Set connection parameters
	conn.SetReadLimit(maxMessageSize)
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	// Start ping ticker
	go client.writePump()
	go client.readPump()

	return client
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister(c.UserID)
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("ws read error user=%d: %v", c.UserID, err)
			}
			break
		}

		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			c.SendJSON(S2CRoomError{Type: S2CTypeRoomError, Code: "parse_error", Message: "无法解析消息"})
			continue
		}

		// Route the message to the appropriate handler
		if handler := messageRouter(msg.Type); handler != nil {
			handler(c.UserID, msg.Data)
		} else {
			c.SendJSON(S2CRoomError{Type: S2CTypeRoomError, Code: "unknown_type", Message: "未知消息类型"})
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// SendJSON marshals and sends a JSON message to the client.
func (c *Client) SendJSON(v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("ws marshal error user=%d: %v", c.UserID, err)
		return err
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.closed {
		select {
		case c.Send <- data:
		default:
			log.Printf("ws send buffer full for user=%d, dropping message", c.UserID)
		}
	}
	return nil
}

// Close closes the client's WebSocket connection and cleans up.
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.closed {
		c.closed = true
		close(c.Send)
	}
	return c.Conn.Close()
}

// messageRouter returns the handler function for a given message type.
// Set externally by the server initialization.
var messageRouter func(msgType string) func(userID int, data json.RawMessage)

// SetMessageRouter sets the message router function.
func SetMessageRouter(router func(msgType string) func(userID int, data json.RawMessage)) {
	messageRouter = router
}
