package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	apihttp "github.com/baha998/Project_Hub/internal/handler/http"
	"github.com/baha998/Project_Hub/internal/repository/postgres"
	"github.com/baha998/Project_Hub/internal/usecase"
	"github.com/baha998/Project_Hub/pkg/jwt"
)

func main() {
	// Load variables from a local .env file into the process environment,
	// e.g. DATABASE_URL/PORT for a Supabase-backed dev setup. A missing
	// .env is expected (and fine) in Docker/production, where the real
	// environment already provides these — so the error is only logged,
	// never fatal.
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("loading .env: %v", err)
	}

	ctx := context.Background()

	pool, err := postgres.NewPool(ctx)
	if err != nil {
		log.Fatalf("connecting to postgres: %v", err)
	}
	defer pool.Close()
	log.Println("connected to postgres")

	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		log.Fatalf("preparing upload directory: %v", err)
	}

	tokens := jwt.NewManager(getEnv("JWT_SECRET", "dev-secret-change-me"), jwtTTL())

	// Repositories.
	userRepo := postgres.NewUserRepository(pool)
	projectRepo := postgres.NewProjectRepository(pool)
	taskRepo := postgres.NewTaskRepository(pool)
	fileRepo := postgres.NewFileRepository(pool)
	analyticsRepo := postgres.NewAnalyticsRepository(pool)

	// Usecases.
	adminSecretKey := getEnv("ADMIN_SECRET_KEY", "kbtu_curator_secret_2026")
	authUC := usecase.NewAuthUsecase(userRepo, tokens, adminSecretKey)
	projectUC := usecase.NewProjectUsecase(projectRepo, userRepo)
	taskUC := usecase.NewTaskUsecase(taskRepo, projectRepo, userRepo)
	fileUC := usecase.NewFileUsecase(fileRepo)
	analyticsUC := usecase.NewAnalyticsUsecase(analyticsRepo)

	// Handlers + router.
	handlers := apihttp.Handlers{
		Auth:      apihttp.NewAuthHandler(authUC),
		Project:   apihttp.NewProjectHandler(projectUC, taskUC, fileUC),
		Task:      apihttp.NewTaskHandler(taskUC),
		File:      apihttp.NewFileHandler(fileUC, uploadDir),
		Analytics: apihttp.NewAnalyticsHandler(analyticsUC),
	}
	router := apihttp.NewRouter(handlers, tokens, uploadDir)

	addr := ":" + getEnv("PORT", "8080")
	log.Printf("Project Hub API listening on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func jwtTTL() time.Duration {
	if raw := os.Getenv("JWT_TTL"); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil {
			return d
		}
	}
	return 24 * time.Hour
}
