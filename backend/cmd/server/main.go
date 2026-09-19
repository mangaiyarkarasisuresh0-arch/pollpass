package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/controllers"
	"live-polling-backend/repository"
	"live-polling-backend/routes"
	"live-polling-backend/services"
	"live-polling-backend/websocket"
)

func main() {
	log.Println("==================================================")
	log.Println(" Starting Live Polling Application Server (Go+Gin)")
	log.Println("==================================================")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Connect to MongoDB
	_, err := config.ConnectMongoDB(cfg)
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to MongoDB: %v", err)
	}

	// 3. Connect to Redis
	_, err = config.ConnectRedis(cfg)
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to Redis: %v", err)
	}

	// 4. Initialize Repositories
	userRepo := repository.NewUserRepository()
	pollRepo := repository.NewPollRepository()
	voteRepo := repository.NewVoteRepository()

	// 5. Initialize Services
	redisService := services.NewRedisService()

	// 6. Initialize WebSocket Hub
	hub := websocket.NewHub(redisService)
	go hub.Run()
	log.Println("[WebSocket] Hub initialized and running")

	// 7. Initialize Controllers
	authCtrl := controllers.NewAuthController(userRepo)
	pollCtrl := controllers.NewPollController(pollRepo, voteRepo, redisService)
	voteCtrl := controllers.NewVoteController(pollRepo, voteRepo, redisService)

	// 8. Setup Router
	router := routes.SetupRouter(authCtrl, pollCtrl, voteCtrl, hub)

	// 9. HTTP Server setup
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server listening on HTTP port %s\n", cfg.Port)
		log.Printf("API Base URL: http://localhost:%s/api\n", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server startup failed: %s\n", err)
		}
	}()

	// 10. Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	// Disconnect Mongo
	if config.MongoClient != nil {
		_ = config.MongoClient.Disconnect(ctx)
	}

	// Close Redis
	if config.RedisClient != nil {
		_ = config.RedisClient.Close()
	}

	log.Println("Server cleanly stopped")
}
