package jwt

import (
	"testing"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

func TestValidateEnforcesHS256(t *testing.T) {
	manager := NewManager("test-secret", time.Hour)
	valid, err := manager.Generate("demo-user", "MEMBER")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := manager.Validate(valid)
	if err != nil || claims.UserID != "demo-user" {
		t.Fatal("HS256 token rejected")
	}
	for _, method := range []*jwtlib.SigningMethodHMAC{jwtlib.SigningMethodHS384, jwtlib.SigningMethodHS512} {
		token := jwtlib.NewWithClaims(method, &Claims{UserID: "demo-user", Role: "ADMIN", RegisteredClaims: jwtlib.RegisteredClaims{ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(time.Hour))}})
		signed, err := token.SignedString([]byte("test-secret"))
		if err != nil {
			t.Fatal(err)
		}
		if _, err = manager.Validate(signed); err == nil {
			t.Fatalf("accepted %s", method.Alg())
		}
	}
}
