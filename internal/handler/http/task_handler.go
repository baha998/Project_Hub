package http

import (
	"net/http"
	"time"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/internal/usecase"
)

type TaskHandler struct {
	tasks *usecase.TaskUsecase
}

func NewTaskHandler(tasks *usecase.TaskUsecase) *TaskHandler {
	return &TaskHandler{tasks: tasks}
}

type createTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Priority    string     `json:"priority"`
	AssigneeID  *string    `json:"assigneeId"`
	DueDate     *time.Time `json:"dueDate"`
}

// parseTaskPriority validates an optional priority string, accepting "" (the
// usecase layer defaults it to MEDIUM) alongside the three enum values.
func parseTaskPriority(raw string) (domain.TaskPriority, bool) {
	priority := domain.TaskPriority(raw)
	switch priority {
	case "", domain.TaskPriorityLow, domain.TaskPriorityMedium, domain.TaskPriorityHigh:
		return priority, true
	default:
		return "", false
	}
}

// Create handles POST /api/v1/projects/{id}/tasks.
func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")

	var req createTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	priority, ok := parseTaskPriority(req.Priority)
	if !ok {
		writeError(w, http.StatusBadRequest, "priority must be one of LOW, MEDIUM, HIGH")
		return
	}

	task, err := h.tasks.Create(r.Context(), projectID, req.Title, req.Description, priority, req.AssigneeID, req.DueDate)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, task)
}

// ListByProject handles GET /api/v1/projects/{id}/tasks.
func (h *TaskHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")

	tasks, err := h.tasks.ListByProject(r.Context(), projectID)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, tasks)
}

type updateTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Priority    string     `json:"priority"`
	AssigneeID  *string    `json:"assigneeId"`
	DueDate     *time.Time `json:"dueDate"`
}

// Update handles PUT /api/v1/tasks/{id}. Requires the caller to hold the
// ADMIN role or own (be the LEAD of) the task's project, enforced by
// TaskUsecase.Update.
func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	taskID := r.PathValue("id")

	var req updateTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	priority, ok := parseTaskPriority(req.Priority)
	if !ok {
		writeError(w, http.StatusBadRequest, "priority must be one of LOW, MEDIUM, HIGH")
		return
	}

	task, err := h.tasks.Update(r.Context(), taskID, caller.ID, caller.Role, req.Title, req.Description, priority, req.AssigneeID, req.DueDate)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, task)
}

type updateTaskStatusRequest struct {
	Status string `json:"status"`
}

// UpdateStatus handles PATCH /api/v1/tasks/{id}/status. The caller must be
// the task's assignee or hold the LEAD/ADMIN role, enforced by
// TaskUsecase.UpdateStatus.
func (h *TaskHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	taskID := r.PathValue("id")

	var req updateTaskStatusRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	status := domain.TaskStatus(req.Status)
	switch status {
	case domain.TaskStatusTodo, domain.TaskStatusInProgress, domain.TaskStatusDone:
	default:
		writeError(w, http.StatusBadRequest, "status must be one of TODO, IN_PROGRESS, DONE")
		return
	}

	if err := h.tasks.UpdateStatus(r.Context(), taskID, caller.ID, caller.Role, status); err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": string(status)})
}

// Delete handles DELETE /api/v1/tasks/{id}. Requires the caller to hold the
// ADMIN role or own (be the LEAD of) the task's project, enforced by
// TaskUsecase.Delete.
func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	taskID := r.PathValue("id")

	if err := h.tasks.Delete(r.Context(), taskID, caller.ID, caller.Role); err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
