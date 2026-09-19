package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	MongoURI    string
	DBName      string
	RedisURL    string
	JWTSecret   string
	FrontendURL string
}

var AppConfig *Config

func LoadConfig() *Config {
	// Try loading .env file (ignore error if running in container with env vars set)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or unable to load, using environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://127.0.0.1:27017"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "livepolling"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "127.0.0.1:6379"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super_secret_jwt_key_guvi_live_polling_2026"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	AppConfig = &Config{
		Port:        port,
		MongoURI:    mongoURI,
		DBName:      dbName,
		RedisURL:    redisURL,
		JWTSecret:   jwtSecret,
		FrontendURL: frontendURL,
	}

	return AppConfig
}
