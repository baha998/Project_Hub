package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/baha998/Project_Hub/internal/domain"
)

type ProjectRepository struct {
	pool *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

var _ domain.ProjectRepository = (*ProjectRepository)(nil)

func (r *ProjectRepository) Create(ctx context.Context, project *domain.Project) error {
	const query = `
		INSERT INTO projects (title, description, status, owner_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`
	err := r.pool.QueryRow(ctx, query, project.Title, project.Description, project.Status, project.OwnerID).
		Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating project: %w", err)
	}
	return nil
}

func (r *ProjectRepository) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	const query = `
		SELECT id, title, description, status, owner_id, is_approved_by_curator, created_at, updated_at
		FROM projects WHERE id = $1`
	var p domain.Project
	err := r.pool.QueryRow(ctx, query, id).
		Scan(&p.ID, &p.Title, &p.Description, &p.Status, &p.OwnerID, &p.IsApprovedByCurator, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("getting project by id: %w", err)
	}
	return &p, nil
}

func (r *ProjectRepository) Update(ctx context.Context, project *domain.Project) error {
	const query = `
		UPDATE projects
		SET title = $1, description = $2, status = $3, updated_at = now()
		WHERE id = $4
		RETURNING updated_at`
	err := r.pool.QueryRow(ctx, query, project.Title, project.Description, project.Status, project.ID).
		Scan(&project.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return fmt.Errorf("updating project: %w", err)
	}
	return nil
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	const query = `DELETE FROM projects WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("deleting project: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *ProjectRepository) List(ctx context.Context, status *domain.ProjectStatus, limit, offset int) ([]*domain.Project, error) {
	const query = `
		SELECT id, title, description, status, owner_id, is_approved_by_curator, created_at, updated_at
		FROM projects
		WHERE $1::project_status IS NULL OR status = $1::project_status
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, query, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("listing projects: %w", err)
	}
	defer rows.Close()

	projects := []*domain.Project{}
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.Status, &p.OwnerID, &p.IsApprovedByCurator, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning project: %w", err)
		}
		projects = append(projects, &p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating projects: %w", err)
	}
	return projects, nil
}

// ToggleApproval flips is_approved_by_curator directly in SQL so concurrent
// curator toggles can't race each other via a stale read-modify-write.
func (r *ProjectRepository) ToggleApproval(ctx context.Context, id string) (*domain.Project, error) {
	const query = `
		UPDATE projects
		SET is_approved_by_curator = NOT is_approved_by_curator, updated_at = now()
		WHERE id = $1
		RETURNING id, title, description, status, owner_id, is_approved_by_curator, created_at, updated_at`
	var p domain.Project
	err := r.pool.QueryRow(ctx, query, id).
		Scan(&p.ID, &p.Title, &p.Description, &p.Status, &p.OwnerID, &p.IsApprovedByCurator, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("toggling project approval: %w", err)
	}
	return &p, nil
}
