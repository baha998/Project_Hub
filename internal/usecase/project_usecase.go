package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/baha998/Project_Hub/internal/domain"
)

// ProjectUsecase wraps ProjectRepository with the access rules from the PRD:
// only LEAD and ADMIN accounts may create projects. It also depends on
// UserRepository so it can confirm the caller's JWT still refers to a real
// account before insert — a token can outlive the user it names (deleted
// account, or a token minted against a different database), and without
// this check that surfaces as an opaque 500 from a foreign-key violation
// instead of a clear auth error.
type ProjectUsecase struct {
	projects domain.ProjectRepository
	users    domain.UserRepository
}

func NewProjectUsecase(projects domain.ProjectRepository, users domain.UserRepository) *ProjectUsecase {
	return &ProjectUsecase{projects: projects, users: users}
}

// Create makes a new project owned by ownerID. It fails with ErrForbidden
// unless the caller holds the LEAD or ADMIN role, and with
// ErrOwnerNotFound if ownerID (taken from the caller's JWT, never from
// request input) no longer names an existing user.
func (uc *ProjectUsecase) Create(ctx context.Context, ownerID string, ownerRole domain.UserRole, title, description string) (*domain.Project, error) {
	if ownerRole != domain.UserRoleLead && ownerRole != domain.UserRoleAdmin {
		return nil, ErrForbidden
	}

	if _, err := uc.users.GetByID(ctx, ownerID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, ErrOwnerNotFound
		}
		return nil, fmt.Errorf("looking up project owner %q: %w", ownerID, err)
	}

	project := &domain.Project{
		Title:       title,
		Description: description,
		Status:      domain.ProjectStatusPlanned,
		OwnerID:     ownerID,
	}
	if err := uc.projects.Create(ctx, project); err != nil {
		return nil, fmt.Errorf("creating project: %w", err)
	}
	return project, nil
}

// GetByID returns the full detail of a single project.
func (uc *ProjectUsecase) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	project, err := uc.projects.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("getting project %q: %w", id, err)
	}
	return project, nil
}

// Update replaces a project's title, description and status. It fails with
// ErrForbidden unless the caller is the project's owner or holds the ADMIN
// role.
func (uc *ProjectUsecase) Update(ctx context.Context, id, callerID string, callerRole domain.UserRole, title, description string, status domain.ProjectStatus) (*domain.Project, error) {
	project, err := uc.projects.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("getting project %q: %w", id, err)
	}

	if callerRole != domain.UserRoleAdmin && project.OwnerID != callerID {
		return nil, ErrForbidden
	}

	project.Title = title
	project.Description = description
	project.Status = status

	if err := uc.projects.Update(ctx, project); err != nil {
		return nil, fmt.Errorf("updating project %q: %w", id, err)
	}
	return project, nil
}

// Delete removes a project. It fails with ErrForbidden unless the caller is
// the project's owner (its LEAD) or holds the ADMIN role.
func (uc *ProjectUsecase) Delete(ctx context.Context, id, callerID string, callerRole domain.UserRole) error {
	project, err := uc.projects.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return err
		}
		return fmt.Errorf("getting project %q: %w", id, err)
	}

	if callerRole != domain.UserRoleAdmin && project.OwnerID != callerID {
		return ErrForbidden
	}

	if err := uc.projects.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting project %q: %w", id, err)
	}
	return nil
}

// List returns a page of projects, optionally filtered by status.
func (uc *ProjectUsecase) List(ctx context.Context, status *domain.ProjectStatus, limit, offset int) ([]*domain.Project, error) {
	projects, err := uc.projects.List(ctx, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("listing projects: %w", err)
	}
	return projects, nil
}

// ToggleApproval flips a project's is_approved_by_curator flag — the
// curator's sign-off that a team's practice work is ready for defense.
// Approving a project (flipping the flag to true) also marks it COMPLETED,
// since curator sign-off is the final step before practice defense;
// revoking approval leaves the status untouched. It fails with ErrForbidden
// unless the caller holds the ADMIN (curator) role.
func (uc *ProjectUsecase) ToggleApproval(ctx context.Context, id string, callerRole domain.UserRole) (*domain.Project, error) {
	if callerRole != domain.UserRoleAdmin {
		return nil, ErrForbidden
	}

	project, err := uc.projects.ToggleApproval(ctx, id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("toggling approval for project %q: %w", id, err)
	}

	if project.IsApprovedByCurator && project.Status != domain.ProjectStatusCompleted {
		project.Status = domain.ProjectStatusCompleted
		if err := uc.projects.Update(ctx, project); err != nil {
			return nil, fmt.Errorf("completing approved project %q: %w", id, err)
		}
	}

	return project, nil
}
