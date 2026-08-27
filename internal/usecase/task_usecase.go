package usecase

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/baha998/Project_Hub/internal/domain"
)

// uuidPattern matches the canonical 8-4-4-4-12 hex UUID form, used to reject
// a malformed assignee ID before it ever reaches the database.
var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// TaskUsecase wraps TaskRepository with the access rules from the PRD: a
// LEAD or ADMIN can manage any task, while a plain MEMBER may only change
// the status of tasks assigned to them. It also keeps a project's status in
// sync with its tasks' progress, so it depends on ProjectRepository too, and
// validates assignee IDs against UserRepository.
type TaskUsecase struct {
	tasks    domain.TaskRepository
	projects domain.ProjectRepository
	users    domain.UserRepository
}

func NewTaskUsecase(tasks domain.TaskRepository, projects domain.ProjectRepository, users domain.UserRepository) *TaskUsecase {
	return &TaskUsecase{tasks: tasks, projects: projects, users: users}
}

// validateAssignee rejects a malformed assignee ID outright, then confirms
// it resolves to an existing user. Both cases surface as ErrInvalidAssignee
// (a 400) instead of a raw database error (a 500) from a UUID type mismatch
// or a foreign-key violation.
func (uc *TaskUsecase) validateAssignee(ctx context.Context, assigneeID *string) error {
	if assigneeID == nil {
		return nil
	}
	if !uuidPattern.MatchString(*assigneeID) {
		return ErrInvalidAssignee
	}
	if _, err := uc.users.GetByID(ctx, *assigneeID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return ErrInvalidAssignee
		}
		return fmt.Errorf("looking up assignee %q: %w", *assigneeID, err)
	}
	return nil
}

// normalizePriority defaults an empty priority to MEDIUM, matching the
// column's database default for callers that never set it explicitly.
func normalizePriority(priority domain.TaskPriority) domain.TaskPriority {
	if priority == "" {
		return domain.TaskPriorityMedium
	}
	return priority
}

// Create adds a new task to a project, starting in the TODO status.
func (uc *TaskUsecase) Create(ctx context.Context, projectID, title, description string, priority domain.TaskPriority, assigneeID *string, dueDate *time.Time) (*domain.Task, error) {
	if err := uc.validateAssignee(ctx, assigneeID); err != nil {
		return nil, err
	}

	task := &domain.Task{
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      domain.TaskStatusTodo,
		Priority:    normalizePriority(priority),
		AssigneeID:  assigneeID,
		DueDate:     dueDate,
	}
	if err := uc.tasks.Create(ctx, task); err != nil {
		return nil, fmt.Errorf("creating task: %w", err)
	}
	return task, nil
}

// ListByProject returns every task belonging to a project.
func (uc *TaskUsecase) ListByProject(ctx context.Context, projectID string) ([]*domain.Task, error) {
	tasks, err := uc.tasks.ListByProject(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("listing tasks for project %q: %w", projectID, err)
	}
	return tasks, nil
}

// UpdateStatus moves a task between TODO, IN_PROGRESS and DONE. The caller
// must be the task's assignee, or hold the LEAD/ADMIN role; anyone else
// gets ErrForbidden.
func (uc *TaskUsecase) UpdateStatus(ctx context.Context, taskID, callerID string, callerRole domain.UserRole, status domain.TaskStatus) error {
	task, err := uc.tasks.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return err
		}
		return fmt.Errorf("getting task %q: %w", taskID, err)
	}

	canManageAnyTask := callerRole == domain.UserRoleAdmin || callerRole == domain.UserRoleLead
	isAssignee := task.AssigneeID != nil && *task.AssigneeID == callerID
	if !canManageAnyTask && !isAssignee {
		return ErrForbidden
	}

	if err := uc.tasks.UpdateStatus(ctx, taskID, status); err != nil {
		return fmt.Errorf("updating status of task %q: %w", taskID, err)
	}

	if err := uc.syncProjectStatus(ctx, task.ProjectID); err != nil {
		return err
	}
	return nil
}

// Update replaces a task's title, description, priority, assignee and due
// date. It fails with ErrForbidden unless the caller holds the ADMIN role or
// is the owner (LEAD) of the task's project.
func (uc *TaskUsecase) Update(ctx context.Context, taskID, callerID string, callerRole domain.UserRole, title, description string, priority domain.TaskPriority, assigneeID *string, dueDate *time.Time) (*domain.Task, error) {
	task, err := uc.tasks.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("getting task %q: %w", taskID, err)
	}

	project, err := uc.projects.GetByID(ctx, task.ProjectID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("getting project %q: %w", task.ProjectID, err)
	}

	if callerRole != domain.UserRoleAdmin && project.OwnerID != callerID {
		return nil, ErrForbidden
	}

	if err := uc.validateAssignee(ctx, assigneeID); err != nil {
		return nil, err
	}

	task.Title = title
	task.Description = description
	task.Priority = normalizePriority(priority)
	task.AssigneeID = assigneeID
	task.DueDate = dueDate

	if err := uc.tasks.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("updating task %q: %w", taskID, err)
	}
	return task, nil
}

// Delete removes a task. It fails with ErrForbidden unless the caller holds
// the ADMIN role or is the owner (LEAD) of the task's project.
func (uc *TaskUsecase) Delete(ctx context.Context, taskID, callerID string, callerRole domain.UserRole) error {
	task, err := uc.tasks.GetByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return err
		}
		return fmt.Errorf("getting task %q: %w", taskID, err)
	}

	project, err := uc.projects.GetByID(ctx, task.ProjectID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return err
		}
		return fmt.Errorf("getting project %q: %w", task.ProjectID, err)
	}

	if callerRole != domain.UserRoleAdmin && project.OwnerID != callerID {
		return ErrForbidden
	}

	if err := uc.tasks.Delete(ctx, taskID); err != nil {
		return fmt.Errorf("deleting task %q: %w", taskID, err)
	}

	return uc.syncProjectStatus(ctx, task.ProjectID)
}

// syncProjectStatus recomputes a project's status from its tasks' current
// statuses, per the PRD's automatic workflow rules:
//   - a project still PLANNED moves to IN_PROGRESS as soon as any of its
//     tasks is IN_PROGRESS;
//   - a project with at least one task moves to COMPLETED once every one
//     of its tasks is DONE.
//
// It's called after every task status change; if the project has since
// been deleted, it's a no-op rather than an error.
func (uc *TaskUsecase) syncProjectStatus(ctx context.Context, projectID string) error {
	project, err := uc.projects.GetByID(ctx, projectID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil
		}
		return fmt.Errorf("getting project %q for status sync: %w", projectID, err)
	}

	siblings, err := uc.tasks.ListByProject(ctx, projectID)
	if err != nil {
		return fmt.Errorf("listing tasks for project %q: %w", projectID, err)
	}

	nextStatus := project.Status
	anyInProgress := false
	allDone := len(siblings) > 0
	for _, t := range siblings {
		if t.Status == domain.TaskStatusInProgress {
			anyInProgress = true
		}
		if t.Status != domain.TaskStatusDone {
			allDone = false
		}
	}

	if project.Status == domain.ProjectStatusPlanned && anyInProgress {
		nextStatus = domain.ProjectStatusInProgress
	}
	if allDone {
		nextStatus = domain.ProjectStatusCompleted
	}

	if nextStatus == project.Status {
		return nil
	}

	project.Status = nextStatus
	if err := uc.projects.Update(ctx, project); err != nil {
		return fmt.Errorf("auto-updating status of project %q: %w", projectID, err)
	}
	return nil
}
