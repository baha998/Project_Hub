// Package http contains the delivery layer: HTTP handlers per entity and
// the router that wires them to the API contract in PROJECT_CONTEXT.md.
package http

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/baha998/Project_Hub/internal/domain"
	"github.com/baha998/Project_Hub/internal/usecase"
)

type apiResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiResponse{Success: true, Data: data})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiResponse{Success: false, Error: message})
}

// writeInternalError logs the underlying error server-side and returns a
// generic 500 to the client, so internals never leak in the response body.
func writeInternalError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal server error")
}

// writeUsecaseError maps sentinel errors from the usecase layer to their
// HTTP status, falling back to a logged 500 for anything unrecognized.
func writeUsecaseError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		writeError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, usecase.ErrForbidden):
		writeError(w, http.StatusForbidden, "you do not have permission to perform this action")
	case errors.Is(err, usecase.ErrEmailTaken):
		writeError(w, http.StatusConflict, "email is already registered")
	case errors.Is(err, usecase.ErrInvalidAdminSecret):
		writeError(w, http.StatusForbidden, "invalid admin secret key")
	case errors.Is(err, usecase.ErrInvalidAssignee):
		writeError(w, http.StatusBadRequest, "assignee does not exist")
	case errors.Is(err, usecase.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "invalid email or password")
	case errors.Is(err, usecase.ErrOwnerNotFound):
		writeError(w, http.StatusUnauthorized, "authenticated user no longer exists, please log in again")
	default:
		writeInternalError(w, err)
	}
}

// decodeJSON reads and decodes a JSON request body, rejecting unknown
// fields so callers get a clear error instead of silently ignored typos.
func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
