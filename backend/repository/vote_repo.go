package repository

import (
	"context"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type VoteRepository struct {
	collection *mongo.Collection
}

func NewVoteRepository() *VoteRepository {
	col := config.MongoDB.Collection("votes")

	// Ensure compound indexes for duplicate check
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "poll_id", Value: 1},
				{Key: "voter_fingerprint", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "poll_id", Value: 1},
				{Key: "ip_address", Value: 1},
			},
		},
	})

	return &VoteRepository{collection: col}
}

func (r *VoteRepository) Create(ctx context.Context, vote *models.Vote) error {
	vote.CreatedAt = time.Now()
	res, err := r.collection.InsertOne(ctx, vote)
	if err != nil {
		return err
	}
	vote.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *VoteRepository) HasUserVoted(ctx context.Context, pollID primitive.ObjectID, fingerprint, ip string) (bool, error) {
	conditions := []bson.M{}
	if fingerprint != "" {
		conditions = append(conditions, bson.M{
			"poll_id":           pollID,
			"voter_fingerprint": fingerprint,
		})
	}
	if ip != "" && fingerprint == "" { // Fallback if fingerprint not provided
		conditions = append(conditions, bson.M{
			"poll_id":    pollID,
			"ip_address": ip,
		})
	}

	if len(conditions) == 0 {
		return false, nil
	}

	filter := bson.M{"$or": conditions}
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *VoteRepository) CountVotesByOption(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": pollID}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$option_id",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	results := make(map[string]int64)
	var total int64 = 0

	type groupResult struct {
		OptionID string `bson:"_id"`
		Count    int64  `bson:"count"`
	}

	for cursor.Next(ctx) {
		var gr groupResult
		if err := cursor.Decode(&gr); err == nil {
			results[gr.OptionID] = gr.Count
			total += gr.Count
		}
	}

	return results, total, nil
}

func (r *VoteRepository) DeleteByPollID(ctx context.Context, pollID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"poll_id": pollID})
	return err
}
