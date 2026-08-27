// Package jwt generates and validates the HS256 access tokens used by the
// API's JWT authentication middleware.
package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned when a token fails signature verification,
// is expired, or is otherwise malformed.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims are the custom JWT claims carried by every access token issued by
// the API, in addition to the standard registered claims.
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Manager signs and verifies access tokens with a single HMAC secret.
type Manager struct {
	secret []byte
	ttl    time.Duration
}

// NewManager builds a Manager. ttl controls how long generated tokens remain
// valid.
func NewManager(secret string, ttl time.Duration) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl}
}

// Generate issues a signed access token embedding userID and role in the
// claims.
func (m *Manager) Generate(userID, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("signing jwt: %w", err)
	}
	return signed, nil
}

// Validate parses and verifies a token string, returning its claims when
// the signature is valid and it has not expired.
func (m *Manager) Validate(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
