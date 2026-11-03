package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://preview.example.com")
	for _, origin := range []string{"https://project-hub-baha998.vercel.app", "http://localhost:5173", "https://preview.example.com", "https://evil.example", "https://project-hub-baha998.vercel.app.evil.example", ""} {
		for _, method := range []string{http.MethodGet, http.MethodOptions} {
			t.Run(origin+method, func(t *testing.T) {
				called := false
				h := CORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true; w.WriteHeader(http.StatusOK) }))
				r := httptest.NewRequest(method, "/api/v1/projects", nil)
				r.Header.Set("Origin", origin)
				w := httptest.NewRecorder()
				h.ServeHTTP(w, r)
				if origin == "https://evil.example" || origin == "https://project-hub-baha998.vercel.app.evil.example" {
					if w.Code != http.StatusForbidden || called || w.Header().Get("Access-Control-Allow-Origin") != "" {
						t.Fatal("untrusted origin allowed")
					}
					return
				}
				if w.Header().Get("Access-Control-Allow-Origin") != origin {
					t.Fatal("incorrect origin")
				}
				if method == http.MethodOptions && (called || w.Code != http.StatusNoContent) {
					t.Fatal("preflight reached downstream")
				}
				if method == http.MethodGet && !called {
					t.Fatal("request did not reach downstream")
				}
			})
		}
	}
}
