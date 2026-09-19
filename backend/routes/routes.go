package routes

import (
	"net/http"

	"live-polling-backend/controllers"
	"live-polling-backend/middleware"
	"live-polling-backend/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	authCtrl *controllers.AuthController,
	pollCtrl *controllers.PollController,
	voteCtrl *controllers.VoteController,
	hub *websocket.Hub,
) *gin.Engine {
	r := gin.Default()

	// Apply CORS
	r.Use(middleware.CORSMiddleware())

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "Live Polling Tool Backend",
		})
	})

	api := r.Group("/api")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/signup", authCtrl.Signup)
			auth.POST("/login", authCtrl.Login)
			auth.GET("/me", middleware.AuthMiddleware(), authCtrl.Me)
		}

		// Public Poll read routes
		api.GET("/polls/:id", pollCtrl.GetPollByID)
		api.GET("/polls/share/:shareCode", pollCtrl.GetPollByShareCode)

		// Voting routes
		api.POST("/polls/:id/vote", voteCtrl.CastVote)
		api.GET("/polls/:id/results", voteCtrl.GetResults)

		// WebSocket route for real-time live updates
		api.GET("/polls/:id/live", hub.ServeWs)

		// Protected Poll creation & management routes
		protected := api.Group("/polls")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("", pollCtrl.CreatePoll)
			protected.GET("/my", pollCtrl.GetMyPolls)
			protected.PATCH("/:id/status", pollCtrl.UpdatePollStatus)
			protected.DELETE("/:id", pollCtrl.DeletePoll)
		}
	}

	// Alias for direct websocket access: /ws/:id
	r.GET("/ws/:id", hub.ServeWs)

	return r
}
