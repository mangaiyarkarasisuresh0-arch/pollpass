package controllers

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"live-polling-backend/models"
	"live-polling-backend/repository"
	"live-polling-backend/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollController struct {
	pollRepo     *repository.PollRepository
	voteRepo     *repository.VoteRepository
	redisService *services.RedisService
}

func NewPollController(
	pollRepo *repository.PollRepository,
	voteRepo *repository.VoteRepository,
	redisService *services.RedisService,
) *PollController {
	return &PollController{
		pollRepo:     pollRepo,
		voteRepo:     voteRepo,
		redisService: redisService,
	}
}

// generateShareCode creates a readable 6-character alphanumeric code
func generateShareCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[num.Int64()]
	}
	return string(b)
}

func (pc *PollController) CreatePoll(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required to create a poll"})
		return
	}
	creatorID := val.(primitive.ObjectID)

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question is required (min 5 characters) and at least 2 options are required"})
		return
	}

	question := strings.TrimSpace(req.Question)
	if len(question) < 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll question must be at least 5 characters long"})
		return
	}

	// Validate options
	seen := make(map[string]bool)
	var options []models.PollOption
	var optIDs []string

	for idx, optText := range req.Options {
		trimmed := strings.TrimSpace(optText)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Option #%d cannot be blank", idx+1)})
			return
		}
		lower := strings.ToLower(trimmed)
		if seen[lower] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate option found: '%s'", trimmed)})
			return
		}
		seen[lower] = true
		optID := fmt.Sprintf("opt_%d", idx+1)
		options = append(options, models.PollOption{
			ID:   optID,
			Text: trimmed,
		})
		optIDs = append(optIDs, optID)
	}

	if len(options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A minimum of 2 distinct options is required"})
		return
	}
	if len(options) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A maximum of 10 options is permitted"})
		return
	}

	// Expiration calculation
	var expiresAt *time.Time
	now := time.Now()
	switch strings.ToLower(req.Expiration) {
	case "1h":
		exp := now.Add(1 * time.Hour)
		expiresAt = &exp
	case "1d":
		exp := now.Add(24 * time.Hour)
		expiresAt = &exp
	case "7d":
		exp := now.Add(7 * 24 * time.Hour)
		expiresAt = &exp
	case "never", "":
		expiresAt = nil
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expiration option. Supported: '1h', '1d', '7d', 'never'"})
		return
	}

	poll := &models.Poll{
		Question:  question,
		Options:   options,
		CreatorID: creatorID,
		ShareCode: generateShareCode(),
		Status:    "active",
		ExpiresAt: expiresAt,
	}

	if err := pc.pollRepo.Create(c.Request.Context(), poll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll record"})
		return
	}

	// Initialize counts in Redis to 0
	_ = pc.redisService.InitPollVotes(c.Request.Context(), poll.ID.Hex(), optIDs)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

func (pc *PollController) GetMyPolls(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	creatorID := val.(primitive.ObjectID)

	polls, err := pc.pollRepo.FindByCreatorID(c.Request.Context(), creatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user polls"})
		return
	}

	// Attach vote totals from Redis
	type PollSummary struct {
		models.Poll
		TotalVotes int64 `json:"total_votes"`
		IsExpired  bool  `json:"is_expired"`
	}

	summaries := make([]PollSummary, len(polls))
	for i, p := range polls {
		_, total, _ := pc.redisService.GetPollVotes(c.Request.Context(), p.ID.Hex())
		// If Redis count was 0 or empty, fallback check in MongoDB
		if total == 0 {
			_, dbTotal, _ := pc.voteRepo.CountVotesByOption(c.Request.Context(), p.ID)
			total = dbTotal
		}

		isExpired := p.ExpiresAt != nil && time.Now().After(*p.ExpiresAt)
		summaries[i] = PollSummary{
			Poll:       p,
			TotalVotes: total,
			IsExpired:  isExpired,
		}
	}

	c.JSON(http.StatusOK, gin.H{"polls": summaries})
}

func (pc *PollController) GetPollByID(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Poll ID format"})
		return
	}

	poll, err := pc.pollRepo.FindByID(c.Request.Context(), objID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	pc.respondWithPollResults(c, poll)
}

func (pc *PollController) GetPollByShareCode(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Param("shareCode")))
	poll, err := pc.pollRepo.FindByShareCode(c.Request.Context(), code)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found with the specified share code"})
		return
	}

	pc.respondWithPollResults(c, poll)
}

func (pc *PollController) respondWithPollResults(c *gin.Context, poll *models.Poll) {
	// Read live counts from Redis
	results, total, err := pc.redisService.GetPollVotes(c.Request.Context(), poll.ID.Hex())
	if err != nil || len(results) == 0 {
		// Redis cache miss: sync from MongoDB aggregation
		dbResults, dbTotal, _ := pc.voteRepo.CountVotesByOption(c.Request.Context(), poll.ID)
		_ = pc.redisService.SyncVotesFromDB(c.Request.Context(), poll.ID.Hex(), dbResults, poll.Options)
		results = dbResults
		total = dbTotal
	}

	// Ensure all options have a key in results
	for _, opt := range poll.Options {
		if _, ok := results[opt.ID]; !ok {
			results[opt.ID] = 0
		}
	}

	// Check if already voted using voter fingerprint/IP header
	fingerprint := c.GetHeader("X-Voter-Fingerprint")
	ip := c.ClientIP()
	hasVoted, _ := pc.voteRepo.HasUserVoted(c.Request.Context(), poll.ID, fingerprint, ip)

	isExpired := poll.ExpiresAt != nil && time.Now().After(*poll.ExpiresAt)

	c.JSON(http.StatusOK, models.PollResultsResponse{
		Poll:       poll,
		TotalVotes: total,
		Results:    results,
		IsExpired:  isExpired,
		HasVoted:   hasVoted,
	})
}

func (pc *PollController) UpdatePollStatus(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(primitive.ObjectID)

	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Poll ID"})
		return
	}

	poll, err := pc.pollRepo.FindByID(c.Request.Context(), objID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the creator of this poll can change its status"})
		return
	}

	var req models.UpdatePollStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be 'active' or 'closed'"})
		return
	}

	if err := pc.pollRepo.UpdateStatus(c.Request.Context(), objID, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update poll status"})
		return
	}

	poll.Status = req.Status
	c.JSON(http.StatusOK, gin.H{
		"message": "Poll status updated successfully",
		"poll":    poll,
	})
}

func (pc *PollController) DeletePoll(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := val.(primitive.ObjectID)

	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Poll ID"})
		return
	}

	poll, err := pc.pollRepo.FindByID(c.Request.Context(), objID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the creator can delete this poll"})
		return
	}

	// Delete from MongoDB
	_ = pc.pollRepo.Delete(c.Request.Context(), objID)
	_ = pc.voteRepo.DeleteByPollID(c.Request.Context(), objID)

	// Clean Redis keys
	pc.redisService.DeletePollData(c.Request.Context(), objID.Hex())

	c.JSON(http.StatusOK, gin.H{"message": "Poll and associated vote data deleted successfully"})
}
