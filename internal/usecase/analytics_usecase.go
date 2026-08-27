package usecase

import (
	"context"
	"fmt"

	"github.com/baha998/Project_Hub/internal/domain"
)

// AnalyticsUsecase wraps AnalyticsRepository, restricting the curator
// dashboard to ADMIN accounts.
type AnalyticsUsecase struct {
	analytics domain.AnalyticsRepository
}

func NewAnalyticsUsecase(analytics domain.AnalyticsRepository) *AnalyticsUsecase {
	return &AnalyticsUsecase{analytics: analytics}
}

// Summary returns the curator dashboard summary. It fails with
// ErrForbidden unless the caller holds the ADMIN role.
func (uc *AnalyticsUsecase) Summary(ctx context.Context, callerRole domain.UserRole) (*domain.AnalyticsSummary, error) {
	if callerRole != domain.UserRoleAdmin {
		return nil, ErrForbidden
	}

	summary, err := uc.analytics.Summary(ctx)
	if err != nil {
		return nil, fmt.Errorf("computing analytics summary: %w", err)
	}
	return summary, nil
}
