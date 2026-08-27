package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/baha998/Project_Hub/internal/domain"
)

type AnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{pool: pool}
}

var _ domain.AnalyticsRepository = (*AnalyticsRepository)(nil)

func (r *AnalyticsRepository) Summary(ctx context.Context) (*domain.AnalyticsSummary, error) {
	// active_tasks and pending_projects both exclude ARCHIVED projects: an
	// archived project is shelved, not something the curator still needs to
	// act on, and its open tasks shouldn't inflate the "active" count.
	// Deleted rows never need explicit exclusion here since every count is a
	// live COUNT(*) against current rows — DELETE (including the CASCADE
	// from a deleted project onto its tasks/media_files) is reflected on the
	// very next read.
	const query = `
		SELECT
			(SELECT COUNT(*) FROM projects) AS total_projects,
			(SELECT COUNT(*)
			   FROM tasks t
			   JOIN projects p ON p.id = t.project_id
			  WHERE t.status <> 'DONE' AND p.status <> 'ARCHIVED') AS active_tasks,
			(SELECT COUNT(*) FROM projects WHERE status = 'COMPLETED') AS completed_projects,
			(SELECT COUNT(*) FROM media_files) AS total_files,
			(SELECT COUNT(*) FROM users WHERE role IN ('LEAD', 'MEMBER')) AS total_students,
			(SELECT COUNT(*) FROM projects WHERE is_approved_by_curator) AS approved_projects,
			(SELECT COUNT(*) FROM projects WHERE NOT is_approved_by_curator AND status <> 'ARCHIVED') AS pending_projects`

	var totalProjects, activeTasks, completedProjects, totalFiles int
	var totalStudents, approvedProjects, pendingProjects int
	err := r.pool.QueryRow(ctx, query).
		Scan(&totalProjects, &activeTasks, &completedProjects, &totalFiles,
			&totalStudents, &approvedProjects, &pendingProjects)
	if err != nil {
		return nil, fmt.Errorf("querying analytics summary: %w", err)
	}

	var completedPct float64
	if totalProjects > 0 {
		completedPct = float64(completedProjects) / float64(totalProjects) * 100
	}

	return &domain.AnalyticsSummary{
		TotalProjects:            totalProjects,
		ActiveTasks:              activeTasks,
		CompletedProjectsPercent: completedPct,
		TotalFiles:               totalFiles,
		TotalStudents:            totalStudents,
		ApprovedProjects:         approvedProjects,
		PendingApprovalProjects:  pendingProjects,
	}, nil
}
