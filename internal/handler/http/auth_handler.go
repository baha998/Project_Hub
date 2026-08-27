package http

import (
	"net/http"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/internal/usecase"
)

type AuthHandler struct {
	auth *usecase.AuthUsecase
}

func NewAuthHandler(auth *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FullName    string `json:"fullName"`
	Role        string `json:"role"`
	AdminSecret string `json:"adminSecret"`
}

// Register handles POST /api/v1/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		writeError(w, http.StatusBadRequest, "email, password and fullName are required")
		return
	}

	role := domain.UserRoleMember
	if req.Role != "" {
		role = domain.UserRole(req.Role)
	}
	switch role {
	case domain.UserRoleAdmin, domain.UserRoleLead, domain.UserRoleMember:
	default:
		writeError(w, http.StatusBadRequest, "role must be one of ADMIN, LEAD, MEMBER")
		return
	}

	user, err := h.auth.Register(r.Context(), req.Email, req.Password, req.FullName, role, req.AdminSecret)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, user)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login handles POST /api/v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	token, user, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		writeUsecaseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  user,
	})
}
