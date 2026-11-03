package http

import (
	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/pkg/jwt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestMemberCannotCreateTasks(t *testing.T) {
	tokens := jwt.NewManager("test-signing-key", time.Hour)
	token, err := tokens.Generate("33333333-3333-4333-8333-333333333333", "MEMBER")
	if err != nil {
		t.Fatal(err)
	}
	handler := NewTaskHandler(nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects/demo/tasks", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	middleware.Auth(tokens)(http.HandlerFunc(handler.Create)).ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("got %d, want 403", w.Code)
	}
}
