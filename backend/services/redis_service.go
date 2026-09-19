package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"live-polling-backend/config"
	"live-polling-backend/models"

	"github.com/redis/go-redis/v9"
)

const (
	VotesKeyPrefix   = "poll:%s:votes"
	VotersKeyPrefix  = "poll:%s:voters"
	ChannelVoteEvent = "poll_updates"
)

type RedisService struct {
	client *redis.Client
}

func NewRedisService() *RedisService {
	return &RedisService{
		client: config.RedisClient,
	}
}

// InitPollVotes initializes vote counts to 0 for all options in a poll
func (s *RedisService) InitPollVotes(ctx context.Context, pollID string, optionIDs []string) error {
	key := fmt.Sprintf(VotesKeyPrefix, pollID)
	pipe := s.client.Pipeline()
	for _, optID := range optionIDs {
		// Only set if not exists
		pipe.HSetNX(ctx, key, optID, 0)
	}
	// Expire cache after 30 days of inactivity
	pipe.Expire(ctx, key, 30*24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

// IncrementVote increments the vote count for a specific option using HINCRBY
func (s *RedisService) IncrementVote(ctx context.Context, pollID, optionID string) (int64, error) {
	key := fmt.Sprintf(VotesKeyPrefix, pollID)
	newCount, err := s.client.HIncrBy(ctx, key, optionID, 1).Result()
	if err != nil {
		return 0, err
	}
	s.client.Expire(ctx, key, 30*24*time.Hour)
	return newCount, nil
}

// GetPollVotes retrieves all option counts for a poll using HGETALL
func (s *RedisService) GetPollVotes(ctx context.Context, pollID string) (map[string]int64, int64, error) {
	key := fmt.Sprintf(VotesKeyPrefix, pollID)
	data, err := s.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, 0, err
	}

	results := make(map[string]int64)
	var total int64 = 0

	for optID, countStr := range data {
		count, _ := strconv.ParseInt(countStr, 10, 64)
		results[optID] = count
		total += count
	}

	return results, total, nil
}

// SyncVotesFromDB loads MongoDB aggregated counts into Redis
func (s *RedisService) SyncVotesFromDB(ctx context.Context, pollID string, counts map[string]int64, options []models.PollOption) error {
	key := fmt.Sprintf(VotesKeyPrefix, pollID)
	pipe := s.client.Pipeline()
	for _, opt := range options {
		count := counts[opt.ID]
		pipe.HSet(ctx, key, opt.ID, count)
	}
	pipe.Expire(ctx, key, 30*24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

// CheckAndRecordVoter checks if voter already exists in Redis Set; if not, adds them
func (s *RedisService) CheckAndRecordVoter(ctx context.Context, pollID, voterIdentifier string) (bool, error) {
	if voterIdentifier == "" {
		return false, nil
	}
	key := fmt.Sprintf(VotersKeyPrefix, pollID)
	isMember, err := s.client.SIsMember(ctx, key, voterIdentifier).Result()
	if err != nil {
		return false, err
	}
	if isMember {
		return true, nil
	}
	// Add to set and keep TTL
	s.client.SAdd(ctx, key, voterIdentifier)
	s.client.Expire(ctx, key, 30*24*time.Hour)
	return false, nil
}

// DeletePollData cleans up Redis keys when a poll is deleted
func (s *RedisService) DeletePollData(ctx context.Context, pollID string) {
	s.client.Del(ctx, fmt.Sprintf(VotesKeyPrefix, pollID))
	s.client.Del(ctx, fmt.Sprintf(VotersKeyPrefix, pollID))
}

// PublishVoteUpdate sends the VOTE_UPDATED event payload to Redis Pub/Sub
func (s *RedisService) PublishVoteUpdate(ctx context.Context, event models.VoteEventMessage) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	channel := fmt.Sprintf("%s:%s", ChannelVoteEvent, event.PollID)
	log.Printf("[Redis Pub/Sub] Publishing VOTE_UPDATED on channel [%s] for option [%s]\n", channel, event.OptionID)
	return s.client.Publish(ctx, channel, payload).Err()
}

// SubscribeToPollChannel subscribes to updates for a specific poll
func (s *RedisService) SubscribeToPollChannel(ctx context.Context, pollID string) *redis.PubSub {
	channel := fmt.Sprintf("%s:%s", ChannelVoteEvent, pollID)
	return s.client.Subscribe(ctx, channel)
}
