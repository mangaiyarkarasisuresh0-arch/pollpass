package config

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoClient *mongo.Client
	MongoDB     *mongo.Database
	RedisClient *redis.Client
	MiniRedis   *miniredis.Miniredis
)

func ConnectMongoDB(cfg *Config) (*mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	MongoClient = client
	MongoDB = client.Database(cfg.DBName)
	log.Printf("Successfully connected to MongoDB database [%s]\n", cfg.DBName)
	return MongoDB, nil
}

func ConnectRedis(cfg *Config) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		// Fallback to direct address if it's not a redis:// URL scheme
		opts = &redis.Options{
			Addr: cfg.RedisURL,
		}
	}

	// 1. Fast TCP connection check to prevent go-redis retry spam if port is closed
	conn, tcpErr := net.DialTimeout("tcp", opts.Addr, 1*time.Second)
	if tcpErr == nil {
		_ = conn.Close()
		rdb := redis.NewClient(opts)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if _, err := rdb.Ping(ctx).Result(); err == nil {
			RedisClient = rdb
			log.Printf("Successfully connected to Redis server at [%s]\n", opts.Addr)
			return RedisClient, nil
		}
	}

	// 2. Resilient fallback to embedded in-memory Redis instance
	log.Printf("[Redis] Notice: External Redis server at [%s] not reachable (%v)\n", opts.Addr, tcpErr)
	log.Println("[Redis] Starting embedded in-memory Redis instance for local development...")
	mr, mrErr := miniredis.Run()
	if mrErr != nil {
		return nil, fmt.Errorf("failed to start fallback miniredis: %w", mrErr)
	}
	MiniRedis = mr
	RedisClient = redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	log.Printf("Successfully connected to Redis at [%s] (Embedded In-Memory)\n", mr.Addr())
	return RedisClient, nil
}


