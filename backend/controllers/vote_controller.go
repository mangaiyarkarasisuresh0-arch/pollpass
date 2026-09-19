package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"live-polling-backend/models"
	"live-polling-backend/repository"
	"live-polling-backend/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VoteController struct {
	pollRepo     *repository.PollRepository
	voteRepo     *repository.VoteRepository
	redisService *services.RedisService
}

func NewVoteController(
	pollRepo *repository.PollRepository,
	voteRepo *repository.VoteRepository,
	redisService *services.RedisService,
) *VoteController {
	return &VoteController{
		pollRepo:     pollRepo,
		voteRepo:     voteRepo,
		redisService: redisService,
	}
}

func (vc *VoteController) CastVote(c *gin.Context) {
	idOrCode := strings.TrimSpace(c.Param("id"))
	if idOrCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll identifier is required"})
		return
	}

	var req models.CastVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Option ID is required to cast a vote"})
		return
	}

	// Retrieve poll either by ObjectID Hex or by ShareCode
	var poll *models.Poll
	var err error
	if objID, errHex := primitive.ObjectIDFromHex(idOrCode); errHex == nil {
		poll, err = vc.pollRepo.FindByID(c.Request.Context(), objID)
	} else {
		poll, err = vc.pollRepo.FindByShareCode(c.Request.Context(), strings.ToUpper(idOrCode))
	}

	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// 1. Validate poll is active
	if poll.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll is closed and no longer accepting votes"})
		return
	}

	// 2. Validate poll has not expired
	if poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll has expired and is no longer accepting votes"})
		return
	}

	// 3. Validate option belongs to poll
	var validOption bool
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			validOption = true
			break
		}
	}
	if !validOption {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Option '%s' is not valid for this poll", req.OptionID)})
		return
	}

	// 4. Validate duplicate vote prevention
	fingerprint := strings.TrimSpace(req.VoterFingerprint)
	if fingerprint == "" {
		fingerprint = strings.TrimSpace(c.GetHeader("X-Voter-Fingerprint"))
	}
	clientIP := c.ClientIP()

	voterIdentifier := fingerprint
	if voterIdentifier == "" {
		voterIdentifier = clientIP
	}

	// First fast-check in Redis Set
	alreadyVotedRedis, _ := vc.redisService.CheckAndRecordVoter(c.Request.Context(), poll.ID.Hex(), voterIdentifier)
	if alreadyVotedRedis {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already submitted a vote for this poll"})
		return
	}

	// Second check in persistent MongoDB votes
	alreadyVotedDB, err := vc.voteRepo.HasUserVoted(c.Request.Context(), poll.ID, fingerprint, clientIP)
	if err == nil && alreadyVotedDB {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already submitted a vote for this poll"})
		return
	}

	// 5. Store vote in MongoDB
	vote := &models.Vote{
		PollID:           poll.ID,
		OptionID:         req.OptionID,
		VoterFingerprint: fingerprint,
		IPAddress:        clientIP,
	}
	if err := vc.voteRepo.Create(c.Request.Context(), vote); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist vote record"})
		return
	}

	// 6. Redis HINCRBY atomic count update
	_, err = vc.redisService.IncrementVote(c.Request.Context(), poll.ID.Hex(), req.OptionID)
	if err != nil {
		// Log error but MongoDB has it stored
		fmt.Printf("[Redis Increment Error]: %v\n", err)
	}

	// 7. Get latest vote counts from Redis
	results, total, _ := vc.redisService.GetPollVotes(c.Request.Context(), poll.ID.Hex())
	// Ensure all options are present in the map
	for _, opt := range poll.Options {
		if _, ok := results[opt.ID]; !ok {
			results[opt.ID] = 0
		}
	}

	// 8. Publish update event to Redis Pub/Sub
	event := models.VoteEventMessage{
		Event:      "VOTE_UPDATED",
		PollID:     poll.ID.Hex(),
		ShareCode:  poll.ShareCode,
		OptionID:   req.OptionID,
		Results:    results,
		TotalVotes: total,
		Timestamp:  time.Now().Unix(),
	}
	_ = vc.redisService.PublishVoteUpdate(c.Request.Context(), event)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Vote recorded successfully",
		"poll_id":     poll.ID.Hex(),
		"option_id":   req.OptionID,
		"results":     results,
		"total_votes": total,
	})
}

func (vc *VoteController) GetResults(c *gin.Context) {
	idOrCode := strings.TrimSpace(c.Param("id"))
	if idOrCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll identifier is required"})
		return
	}

	var poll *models.Poll
	var err error
	if objID, errHex := primitive.ObjectIDFromHex(idOrCode); errHex == nil {
		poll, err = vc.pollRepo.FindByID(c.Request.Context(), objID)
	} else {
		poll, err = vc.pollRepo.FindByShareCode(c.Request.Context(), strings.ToUpper(idOrCode))
	}

	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	results, total, err := vc.redisService.GetPollVotes(c.Request.Context(), poll.ID.Hex())
	if err != nil || len(results) == 0 {
		dbResults, dbTotal, _ := vc.voteRepo.CountVotesByOption(c.Request.Context(), poll.ID)
		_ = vc.redisService.SyncVotesFromDB(c.Request.Context(), poll.ID.Hex(), dbResults, poll.Options)
		results = dbResults
		total = dbTotal
	}

	for _, opt := range poll.Options {
		if _, ok := results[opt.ID]; !ok {
			results[opt.ID] = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"poll_id":     poll.ID.Hex(),
		"share_code":  poll.ShareCode,
		"question":    poll.Question,
		"options":     poll.Options,
		"results":     results,
		"total_votes": total,
	})
}
