package repository

import (
	"context"
	"errors"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PollRepository struct {
	collection *mongo.Collection
}

func NewPollRepository() *PollRepository {
	col := config.MongoDB.Collection("polls")

	// Ensure unique index on share_code and index on creator_id
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.M{"share_code": 1},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.M{"creator_id": 1},
		},
	})

	return &PollRepository{collection: col}
}

func (r *PollRepository) Create(ctx context.Context, poll *models.Poll) error {
	poll.CreatedAt = time.Now()
	res, err := r.collection.InsertOne(ctx, poll)
	if err != nil {
		return err
	}
	poll.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *PollRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	var poll models.Poll
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *PollRepository) FindByShareCode(ctx context.Context, code string) (*models.Poll, error) {
	var poll models.Poll
	err := r.collection.FindOne(ctx, bson.M{"share_code": code}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *PollRepository) FindByCreatorID(ctx context.Context, creatorID primitive.ObjectID) ([]models.Poll, error) {
	cursor, err := r.collection.Find(ctx, bson.M{"creator_id": creatorID}, options.Find().SetSort(bson.M{"created_at": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	if polls == nil {
		polls = []models.Poll{}
	}
	return polls, nil
}

func (r *PollRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status string) error {
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"status": status}})
	return err
}

func (r *PollRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
