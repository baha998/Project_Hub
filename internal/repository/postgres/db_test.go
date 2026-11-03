package postgres

import (
	"github.com/jackc/pgx/v5"
	"testing"
)

func TestPoolConfig(t *testing.T) {
	for _, tt := range []struct {
		name, dsn            string
		simple, tls, invalid bool
	}{
		{"direct", "postgres://postgres:secret@db.example.supabase.com:5432/postgres?sslmode=require", false, true, false},
		{"direct co SSL default", "postgres://postgres:secret@db.example.supabase.co:5432/postgres", false, true, false},
		{"insecure direct co", "postgres://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=disable", false, false, true},
		{"transaction pooler", "postgresql://postgres.ref:secret@aws-0-region.pooler.supabase.com:6543/postgres", true, true, false},
		{"session pooler", "postgresql://postgres.ref:secret@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require", false, true, false},
		{"legacy flag", "postgres://u:p@localhost/db?prefer_simple_protocol=true&sslmode=disable", true, false, false},
		{"insecure Supabase", "postgres://u:p@db.example.supabase.com/db?sslmode=disable", false, false, true},
		{"fallback TLS", "postgres://u:p@db.example.supabase.com/db?sslmode=prefer", false, false, true},
		{"bad scheme", "https://localhost/db", false, false, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := poolConfig(Config{DatabaseURL: tt.dsn})
			if tt.invalid {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if (cfg.ConnConfig.DefaultQueryExecMode == pgx.QueryExecModeSimpleProtocol) != tt.simple {
				t.Fatal("unexpected execution mode")
			}
			if (cfg.ConnConfig.TLSConfig != nil) != tt.tls {
				t.Fatal("unexpected TLS configuration")
			}
			if _, ok := cfg.ConnConfig.RuntimeParams["prefer_simple_protocol"]; ok {
				t.Fatal("legacy flag leaked to server")
			}
		})
	}
}

func TestDSNEscapesCredentials(t *testing.T) {
	cfg, err := poolConfig(Config{Host: "localhost", Port: "5432", User: "a@b", Password: "p@ss:/?#", DBName: "hub", SSLMode: "disable"})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ConnConfig.User != "a@b" || cfg.ConnConfig.Password != "p@ss:/?#" {
		t.Fatal("credentials changed")
	}
}
