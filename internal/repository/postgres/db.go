package postgres

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds PostgreSQL connection settings sourced from environment
// variables. If DatabaseURL is set it takes precedence over the discrete
// fields, which otherwise fall back to values matching docker-compose.yml.
type Config struct {
	DatabaseURL string
	Host        string
	Port        string
	User        string
	Password    string
	DBName      string
	SSLMode     string
}

// LoadConfigFromEnv reads connection settings from the environment:
// DATABASE_URL (full DSN, takes precedence), or DB_HOST, DB_PORT, DB_USER,
// DB_PASSWORD, DB_NAME, DB_SSLMODE.
func LoadConfigFromEnv() Config {
	return Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Host:        getEnv("DB_HOST", "localhost"),
		Port:        getEnv("DB_PORT", "5432"),
		User:        getEnv("DB_USER", "project_hub"),
		Password:    getEnv("DB_PASSWORD", "project_hub"),
		DBName:      getEnv("DB_NAME", "project_hub"),
		SSLMode:     getEnv("DB_SSLMODE", "disable"),
	}
}

// DSN returns the PostgreSQL connection string built from the config.
func (c Config) DSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.DBName, c.SSLMode)
}

// NewPool creates and verifies a PostgreSQL connection pool using
// configuration read from the environment.
func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	cfg := LoadConfigFromEnv()

	poolCfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("parsing postgres config: %w", err)
	}
	poolCfg.MaxConns = 10
	poolCfg.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("creating postgres pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pinging postgres: %w", err)
	}

	return pool, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
