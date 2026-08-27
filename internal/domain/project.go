package domain

import (
	"context"
	"time"
)

type ProjectStatus string

const (
	ProjectStatusPlanned    ProjectStatus = "PLANNED"
	ProjectStatusInProgress ProjectStatus = "IN_PROGRESS"
	ProjectStatusCompleted  ProjectStatus = "COMPLETED"
	ProjectStatusArchived   ProjectStatus = "ARCHIVED"
)

type Project struct {
	ID                  string        `json:"id" db:"id"`
	Title               string        `json:"title" db:"title"`
	Description         string        `json:"description" db:"description"`
	Status              ProjectStatus `json:"status" db:"status"`
	OwnerID             string        `json:"ownerId" db:"owner_id"`
	IsApprovedByCurator bool          `json:"isApprovedByCurator" db:"is_approved_by_curator"`
	CreatedAt           time.Time     `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time     `json:"updatedAt" db:"updated_at"`
}

type ProjectRepository interface {
	Create(ctx context.Context, project *Project) error
	GetByID(ctx context.Context, id string) (*Project, error)
	Update(ctx context.Context, project *Project) error
	Delete(ctx context.Context, id string) error
	// List returns projects filtered by status when status is non-nil.
	List(ctx context.Context, status *ProjectStatus, limit, offset int) ([]*Project, error)
	// ToggleApproval flips is_approved_by_curator and returns the updated
	// project. Used by the curator (ADMIN) sign-off workflow.
	ToggleApproval(ctx context.Context, id string) (*Project, error)
}
