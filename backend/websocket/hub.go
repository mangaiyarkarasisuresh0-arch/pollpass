package websocket

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"live-polling-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/multi-browser testing
	},
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	pollID string
}

type Hub struct {
	mu           sync.RWMutex
	rooms        map[string]map[*Client]bool
	subscribers  map[string]*redis.PubSub
	cancelFuncs  map[string]context.CancelFunc
	register     chan *Client
	unregister   chan *Client
	redisService *services.RedisService
}

func NewHub(redisService *services.RedisService) *Hub {
	return &Hub{
		rooms:        make(map[string]map[*Client]bool),
		subscribers:  make(map[string]*redis.PubSub),
		cancelFuncs:  make(map[string]context.CancelFunc),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		redisService: redisService,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.pollID] == nil {
				h.rooms[client.pollID] = make(map[*Client]bool)
				// Start Redis Pub/Sub listener for this poll room
				h.startRedisListener(client.pollID)
			}
			h.rooms[client.pollID][client] = true
			h.mu.Unlock()
			log.Printf("[WebSocket] Client joined poll room [%s]. Total in room: %d\n", client.pollID, len(h.rooms[client.pollID]))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.pollID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.send)
					log.Printf("[WebSocket] Client left poll room [%s]. Remaining: %d\n", client.pollID, len(clients))
					if len(clients) == 0 {
						delete(h.rooms, client.pollID)
						h.stopRedisListener(client.pollID)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) startRedisListener(pollID string) {
	ctx, cancel := context.WithCancel(context.Background())
	h.cancelFuncs[pollID] = cancel

	pubsub := h.redisService.SubscribeToPollChannel(ctx, pollID)
	h.subscribers[pollID] = pubsub

	go func() {
		ch := pubsub.Channel()
		log.Printf("[WebSocket Hub] Redis subscriber started for poll [%s]\n", pollID)
		for msg := range ch {
			h.broadcastToRoom(pollID, []byte(msg.Payload))
		}
		log.Printf("[WebSocket Hub] Redis subscriber stopped for poll [%s]\n", pollID)
	}()
}

func (h *Hub) stopRedisListener(pollID string) {
	if cancel, ok := h.cancelFuncs[pollID]; ok {
		cancel()
		delete(h.cancelFuncs, pollID)
	}
	if pubsub, ok := h.subscribers[pollID]; ok {
		_ = pubsub.Close()
		delete(h.subscribers, pollID)
	}
}

func (h *Hub) broadcastToRoom(pollID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.rooms[pollID]; ok {
		for client := range clients {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(clients, client)
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// ServeWs handles websocket requests from peers
func (h *Hub) ServeWs(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll ID is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("[WebSocket Upgrade Error]:", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		pollID: pollID,
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}
