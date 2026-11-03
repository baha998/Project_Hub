package postgres

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
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
	u := url.URL{Scheme: "postgres", User: url.UserPassword(c.User, c.Password),
		Host: net.JoinHostPort(c.Host, c.Port), Path: "/" + c.DBName}
	u.RawQuery = url.Values{"sslmode": {c.SSLMode}}.Encode()
	return u.String()
}

// poolConfig uses pgx v5's simple protocol for transaction-mode poolers.
func poolConfig(cfg Config) (*pgxpool.Config, error) {
	u, err := url.Parse(cfg.DSN())
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") {
		return nil, fmt.Errorf("DATABASE_URL must be a postgres:// or postgresql:// URI")
	}
	q := u.Query()
	isSupabase := strings.HasSuffix(u.Hostname(), ".supabase.com") || strings.HasSuffix(u.Hostname(), ".supabase.co")
	if isSupabase && q.Get("sslmode") == "" {
		q.Set("sslmode", "require")
	}
	preferSimple := q.Get("prefer_simple_protocol")
	if preferSimple != "" && preferSimple != "true" && preferSimple != "false" {
		return nil, fmt.Errorf("prefer_simple_protocol must be true or false")
	}
	// Translate the legacy option instead of sending it to PostgreSQL.
	q.Del("prefer_simple_protocol")
	u.RawQuery = q.Encode()
	poolCfg, err := pgxpool.ParseConfig(u.String())
	if err != nil {
		return nil, fmt.Errorf("invalid PostgreSQL connection configuration")
	}
	if poolCfg.ConnConfig.Port == 6543 || preferSimple == "true" {
		poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
		poolCfg.ConnConfig.StatementCacheCapacity = 0
		poolCfg.ConnConfig.DescriptionCacheCapacity = 0
	}
	if isSupabase && (poolCfg.ConnConfig.TLSConfig == nil || len(poolCfg.ConnConfig.Fallbacks) > 0) {
		return nil, fmt.Errorf("Supabase connections require sslmode=require, verify-ca, or verify-full")
	}
	poolCfg.MaxConns = 10
	poolCfg.MaxConnLifetime = time.Hour
	poolCfg.ConnConfig.ConnectTimeout = 10 * time.Second
	return poolCfg, nil
}

// NewPool creates and verifies a PostgreSQL connection pool using
// configuration read from the environment.
func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	cfg := LoadConfigFromEnv()

	poolCfg, err := poolConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("parsing postgres config: %w", err)
	}

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
