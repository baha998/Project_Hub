package middleware

import (
	"net/http"
	"os"
	"strings"
)

// CORS allows browser-based frontends (e.g. the Vite dev server on a
// different origin) to call the API, and short-circuits preflight OPTIONS
// requests before they reach routing or auth.
func CORS(next http.Handler) http.Handler {
	allowed := map[string]bool{
		"https://project-hub-baha998.vercel.app": true,
		"http://localhost:5173":                  true,
		"http://localhost:4173":                  true,
		"http://localhost:3000":                  true,
		"http://127.0.0.1:5173":                  true,
		"http://127.0.0.1:4173":                  true,
	}
	for _, origin := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			allowed[origin] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Origin")
		origin := r.Header.Get("Origin")
		if origin != "" && !allowed[origin] {
			http.Error(w, "origin is not allowed", http.StatusForbidden)
			return
		}
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
