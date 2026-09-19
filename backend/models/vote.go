package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Vote struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID           primitive.ObjectID `bson:"poll_id" json:"poll_id"`
	OptionID         string             `bson:"option_id" json:"option_id"`
	VoterFingerprint string             `bson:"voter_fingerprint" json:"voter_fingerprint"`
	IPAddress        string             `bson:"ip_address" json:"ip_address"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
}

type CastVoteRequest struct {
	OptionID         string `json:"option_id" binding:"required"`
	VoterFingerprint string `json:"voter_fingerprint"`
}

type VoteEventMessage struct {
	Event      string           `json:"event"`
	PollID     string           `json:"poll_id"`
	ShareCode  string           `json:"share_code"`
	OptionID   string           `json:"option_id"`
	Results    map[string]int64 `json:"results"`
	TotalVotes int64            `json:"total_votes"`
	Timestamp  int64            `json:"timestamp"`
}
