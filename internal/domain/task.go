package domain

import (
	"context"
	"time"
)

type TaskStatus string

const (
	TaskStatusTodo       TaskStatus = "TODO"
	TaskStatusInProgress TaskStatus = "IN_PROGRESS"
	TaskStatusDone       TaskStatus = "DONE"
)

type TaskPriority string

const (
	TaskPriorityLow    TaskPriority = "LOW"
	TaskPriorityMedium TaskPriority = "MEDIUM"
	TaskPriorityHigh   TaskPriority = "HIGH"
)

type Task struct {
	ID          string       `json:"id" db:"id"`
	ProjectID   string       `json:"projectId" db:"project_id"`
	Title       string       `json:"title" db:"title"`
	Description string       `json:"description" db:"description"`
	Status      TaskStatus   `json:"status" db:"status"`
	Priority    TaskPriority `json:"priority" db:"priority"`
	AssigneeID  *string      `json:"assigneeId,omitempty" db:"assignee_id"`
	DueDate     *time.Time   `json:"dueDate,omitempty" db:"due_date"`
	CreatedAt   time.Time    `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time    `json:"updatedAt" db:"updated_at"`
}

type TaskRepository interface {
	Create(ctx context.Context, task *Task) error
	GetByID(ctx context.Context, id string) (*Task, error)
	Update(ctx context.Context, task *Task) error
	UpdateStatus(ctx context.Context, id string, status TaskStatus) error
	Delete(ctx context.Context, id string) error
	ListByProject(ctx context.Context, projectID string) ([]*Task, error)
}
