package http

import (
	"net/http"

	"github.com/baha998/Project_Hub/internal/handler/http/middleware"
	"github.com/baha998/Project_Hub/internal/usecase"
)

type AnalyticsHandler struct {
	analytics *usecase.AnalyticsUsecase
}

func NewAnalyticsHandler(analytics *usecase.AnalyticsUsecase) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: analytics}
}

// Summary handles GET /api/v1/analytics/summary. Restricted to ADMIN,
// enforced by AnalyticsUsecase.Summary.
func (h *AnalyticsHandler) Summary(w http.ResponseWriter, r *http.Request) {
	caller, ok := middleware.UserFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	summary, err := h.analytics.Summary(r.Context(), caller.Role)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, summary)
}
