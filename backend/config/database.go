package config

import (
	"context"
	"log"
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

	rdb := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Printf("[Redis] Notice: External Redis at [%s] not reachable (%v)\n", cfg.RedisURL, err)
		log.Println("[Redis] Starting embedded in-memory Redis instance for local development...")
		mr, mrErr := miniredis.Run()
		if mrErr != nil {
			return nil, err
		}
		MiniRedis = mr
		rdb = redis.NewClient(&redis.Options{
			Addr: mr.Addr(),
		})
		log.Printf("[Redis] In-memory Redis successfully initialized at [%s]\n", mr.Addr())
	}

	RedisClient = rdb
	log.Printf("Successfully connected to Redis at [%s]\n", rdb.Options().Addr)
	return RedisClient, nil
}

