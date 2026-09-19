# Multi-stage build for Go Gin Backend
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy dependency manifests and download modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Final lightweight runner image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/.env.example .env

EXPOSE 8080

CMD ["./server"]
