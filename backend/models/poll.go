package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollOption struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Votes int64  `bson:"-" json:"votes"` // populated from Redis/MongoDB
}

type Poll struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Question  string             `bson:"question" json:"question"`
	Options   []PollOption       `bson:"options" json:"options"`
	CreatorID primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	ShareCode string             `bson:"share_code" json:"share_code"`
	Status    string             `bson:"status" json:"status"` // "active" | "closed"
	ExpiresAt *time.Time         `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type CreatePollRequest struct {
	Question   string   `json:"question" binding:"required,min=5,max=500"`
	Options    []string `json:"options" binding:"required,min=2,max=10"`
	Expiration string   `json:"expiration"` // "1h", "1d", "7d", "never"
}

type UpdatePollStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active closed"`
}

type PollResultsResponse struct {
	Poll       *Poll            `json:"poll"`
	TotalVotes int64            `json:"total_votes"`
	Results    map[string]int64 `json:"results"` // optionID -> count
	IsExpired  bool             `json:"is_expired"`
	HasVoted   bool             `json:"has_voted,omitempty"`
}
