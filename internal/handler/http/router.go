package http

import (
	"net/http"

	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/pkg/jwt"
)

// Handlers bundles every entity handler needed to build the router.
type Handlers struct {
	Auth      *AuthHandler
	Project   *ProjectHandler
	Task      *TaskHandler
	File      *FileHandler
	Analytics *AnalyticsHandler
}

// NewRouter wires every REST endpoint from PROJECT_CONTEXT.md onto a single
// http.Handler. CORS applies to every route; JWT authentication applies to
// every route except health, register and login.
//
// uploadDir is also served directly under /uploads/ so uploaded files have
// a working download URL. It is intentionally left outside JWT auth, since
// a plain <a href> download can't attach an Authorization header; files are
// protected only by their random on-disk name (see FileHandler.Upload).
func NewRouter(h Handlers, tokens *jwt.Manager, uploadDir string) http.Handler {
	mux := http.NewServeMux()
	requireAuth := middleware.Auth(tokens)

	mux.HandleFunc("GET /api/v1/health", healthHandler)

	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))

	// Auth — public.
	mux.HandleFunc("POST /api/v1/auth/register", h.Auth.Register)
	mux.HandleFunc("POST /api/v1/auth/login", h.Auth.Login)

	// Projects — authenticated; role/ownership checks happen in the usecase layer.
	mux.Handle("GET /api/v1/projects", requireAuth(http.HandlerFunc(h.Project.List)))
	mux.Handle("POST /api/v1/projects", requireAuth(http.HandlerFunc(h.Project.Create)))
	mux.Handle("GET /api/v1/projects/{id}", requireAuth(http.HandlerFunc(h.Project.GetByID)))
	mux.Handle("PUT /api/v1/projects/{id}", requireAuth(http.HandlerFunc(h.Project.Update)))
	mux.Handle("DELETE /api/v1/projects/{id}", requireAuth(http.HandlerFunc(h.Project.Delete)))
	mux.Handle("PATCH /api/v1/projects/{id}/approve", requireAuth(http.HandlerFunc(h.Project.ToggleApproval)))

	// Tasks — authenticated.
	mux.Handle("GET /api/v1/projects/{id}/tasks", requireAuth(http.HandlerFunc(h.Task.ListByProject)))
	mux.Handle("POST /api/v1/projects/{id}/tasks", requireAuth(http.HandlerFunc(h.Task.Create)))
	mux.Handle("PUT /api/v1/tasks/{id}", requireAuth(http.HandlerFunc(h.Task.Update)))
	mux.Handle("PATCH /api/v1/tasks/{id}/status", requireAuth(http.HandlerFunc(h.Task.UpdateStatus)))
	mux.Handle("DELETE /api/v1/tasks/{id}", requireAuth(http.HandlerFunc(h.Task.Delete)))

	// Files — authenticated.
	mux.Handle("POST /api/v1/projects/{id}/files", requireAuth(http.HandlerFunc(h.File.Upload)))
	mux.Handle("GET /api/v1/projects/{id}/files", requireAuth(http.HandlerFunc(h.File.ListByProject)))
	mux.Handle("DELETE /api/v1/files/{id}", requireAuth(http.HandlerFunc(h.File.Delete)))

	// Analytics — authenticated; ADMIN-only, enforced by the usecase layer.
	mux.Handle("GET /api/v1/analytics/summary", requireAuth(http.HandlerFunc(h.Analytics.Summary)))

	return middleware.CORS(mux)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
