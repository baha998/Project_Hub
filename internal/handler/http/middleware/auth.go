// Package middleware holds HTTP middleware shared across the API's routes.
package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/pkg/jwt"
)

type contextKey int

const (
	userIDContextKey contextKey = iota
	userRoleContextKey
)

// AuthUser is the identity carried by a validated JWT access token.
type AuthUser struct {
	ID   string
	Role domain.UserRole
}

// Auth returns middleware that requires a "Bearer <token>" Authorization
// header, validates the token via tokens, and stores the caller's user ID
// and role in the request context for downstream handlers.
func Auth(tokens *jwt.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			scheme, token, found := strings.Cut(header, " ")
			if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
				writeUnauthorized(w, "missing or malformed Authorization header")
				return
			}

			claims, err := tokens.Validate(token)
			if err != nil {
				writeUnauthorized(w, "invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, userRoleContextKey, domain.UserRole(claims.Role))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserFromContext extracts the authenticated caller stored by Auth. ok is
// false if the request never passed through the Auth middleware.
func UserFromContext(ctx context.Context) (AuthUser, bool) {
	id, ok := ctx.Value(userIDContextKey).(string)
	if !ok {
		return AuthUser{}, false
	}
	role, ok := ctx.Value(userRoleContextKey).(domain.UserRole)
	if !ok {
		return AuthUser{}, false
	}
	return AuthUser{ID: id, Role: role}, true
}

func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(struct {
		Success bool   `json:"success"`
		Error   string `json:"error"`
	}{Success: false, Error: message})
}
