# Multi-stage build for Go Gin Backend
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy backend dependency manifests
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code and build statically linked binary
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Final lightweight runner image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/.env.example .env

EXPOSE 8080

CMD ["./server"]
