package domain

import "context"

// AnalyticsSummary is the curator dashboard summary returned by
// GET /api/v1/analytics/summary.
type AnalyticsSummary struct {
	TotalProjects            int     `json:"totalProjects"`
	ActiveTasks              int     `json:"activeTasks"`
	CompletedProjectsPercent float64 `json:"completedProjectsPercent"`
	TotalFiles               int     `json:"totalFiles"`
	// TotalStudents counts LEAD/MEMBER accounts — the students and team
	// members a curator is tracking across all practice projects.
	TotalStudents int `json:"totalStudents"`
	// ApprovedProjects and PendingApprovalProjects partition all projects
	// by the curator sign-off flag (is_approved_by_curator).
	ApprovedProjects        int `json:"approvedProjects"`
	PendingApprovalProjects int `json:"pendingApprovalProjects"`
}

type AnalyticsRepository interface {
	Summary(ctx context.Context) (*AnalyticsSummary, error)
}
