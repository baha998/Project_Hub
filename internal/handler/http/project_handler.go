package http

import (
	"net/http"
	"strconv"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/internal/usecase"
)

type ProjectHandler struct {
	projects *usecase.ProjectUsecase
	tasks    *usecase.TaskUsecase
	files    *usecase.FileUsecase
}

func NewProjectHandler(projects *usecase.ProjectUsecase, tasks *usecase.TaskUsecase, files *usecase.FileUsecase) *ProjectHandler {
	return &ProjectHandler{projects: projects, tasks: tasks, files: files}
}

type createProjectRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// Create handles POST /api/v1/projects. Requires the LEAD or ADMIN role,
// enforced by ProjectUsecase.Create.
func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req createProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	project, err := h.projects.Create(r.Context(), caller.ID, caller.Role, req.Title, req.Description)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, project)
}

// List handles GET /api/v1/projects, with pagination and an optional
// ?status= filter.
func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)

	var status *domain.ProjectStatus
	if raw := r.URL.Query().Get("status"); raw != "" {
		s := domain.ProjectStatus(raw)
		status = &s
	}

	projects, err := h.projects.List(r.Context(), status, limit, offset)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, projects)
}

type updateProjectRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

// Update handles PUT /api/v1/projects/{id}. Requires the caller to be the
// project's owner or hold the ADMIN role, enforced by ProjectUsecase.Update.
func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id := r.PathValue("id")

	var req updateProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	status := domain.ProjectStatus(req.Status)
	switch status {
	case domain.ProjectStatusPlanned, domain.ProjectStatusInProgress, domain.ProjectStatusCompleted, domain.ProjectStatusArchived:
	default:
		writeError(w, http.StatusBadRequest, "status must be one of PLANNED, IN_PROGRESS, COMPLETED, ARCHIVED")
		return
	}

	project, err := h.projects.Update(r.Context(), id, caller.ID, caller.Role, req.Title, req.Description, status)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, project)
}

// Delete handles DELETE /api/v1/projects/{id}. Requires the caller to be the
// project's owner (LEAD) or hold the ADMIN role, enforced by
// ProjectUsecase.Delete.
func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id := r.PathValue("id")

	if err := h.projects.Delete(r.Context(), id, caller.ID, caller.Role); err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type projectDetail struct {
	Project *domain.Project     `json:"project"`
	Tasks   []*domain.Task      `json:"tasks"`
	Files   []*domain.MediaFile `json:"files"`
}

// GetByID handles GET /api/v1/projects/{id}, returning the project plus
// its tasks and files as specified in PROJECT_CONTEXT.md.
func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	project, err := h.projects.GetByID(r.Context(), id)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	tasks, err := h.tasks.ListByProject(r.Context(), id)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	files, err := h.files.ListByProject(r.Context(), id)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, projectDetail{Project: project, Tasks: tasks, Files: files})
}

// ToggleApproval handles PATCH /api/v1/projects/{id}/approve, flipping the
// curator's sign-off flag. Restricted to the ADMIN role, enforced by
// ProjectUsecase.ToggleApproval.
func (h *ProjectHandler) ToggleApproval(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id := r.PathValue("id")

	project, err := h.projects.ToggleApproval(r.Context(), id, caller.Role)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, project)
}

func parsePagination(r *http.Request) (limit, offset int) {
	limit, offset = 20, 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			limit = v
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v >= 0 {
			offset = v
		}
	}
	return limit, offset
}
